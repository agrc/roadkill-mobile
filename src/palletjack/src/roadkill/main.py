#!/usr/bin/env python
# * coding: utf8 *
"""
Run the roadkill skid script as a cloud function.
"""
import datetime
import json
import logging
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace

import arcgis
import numpy as np
import pandas as pd
from supervisor.message_handlers import SendGridHandler
from supervisor.models import MessageDetails, Supervisor

from palletjack import FeatureServiceInlineUpdater, PostgresLoader

#: This makes it work when calling with just `python <file>`/installing via pip and in the gcf framework, where
#: the relative imports fail because of how it's calling the function.
try:
    from . import config, version
except ImportError:
    import config
    import version


def _get_secrets():
    """A helper method for loading secrets from either a GCF mount point or the local src/roadkill/secrets/secrets.json file

    Raises:
        FileNotFoundError: If the secrets file can't be found.

    Returns:
        dict: The secrets .json loaded as a dictionary
    """

    secret_folder = Path("/secrets")

    #: Try to get the secrets from the Cloud Function mount point
    if secret_folder.exists():
        return json.loads(Path("/secrets/app/secrets.json").read_text(encoding="utf-8"))

    #: Otherwise, try to load a local copy for local development
    secret_folder = Path(__file__).parent / "secrets"
    if secret_folder.exists():
        return json.loads((secret_folder / "secrets.json").read_text(encoding="utf-8"))

    raise FileNotFoundError("Secrets folder not found; secrets not loaded.")


def _initialize(log_path, sendgrid_api_key):
    """A helper method to set up logging and supervisor

    Args:
        log_path (Path): File path for the logfile to be written
        sendgrid_api_key (str): The API key for sendgrid for this particular application

    Returns:
        Supervisor: The supervisor object used for sending messages
    """

    skid_logger = logging.getLogger(config.SKID_NAME)
    skid_logger.setLevel(config.LOG_LEVEL)
    palletjack_logger = logging.getLogger("palletjack")
    palletjack_logger.setLevel(config.LOG_LEVEL)

    cli_handler = logging.StreamHandler(sys.stdout)
    cli_handler.setLevel(config.LOG_LEVEL)
    formatter = logging.Formatter(
        fmt="%(levelname)-7s %(asctime)s %(name)15s:%(lineno)5s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    cli_handler.setFormatter(formatter)

    log_handler = logging.FileHandler(log_path, mode="w")
    log_handler.setLevel(config.LOG_LEVEL)
    log_handler.setFormatter(formatter)

    skid_logger.addHandler(cli_handler)
    skid_logger.addHandler(log_handler)
    palletjack_logger.addHandler(cli_handler)
    palletjack_logger.addHandler(log_handler)

    #: Log any warnings at logging.WARNING
    #: Put after everything else to prevent creating a duplicate, default formatter
    #: (all log messages were duplicated if put at beginning)
    logging.captureWarnings(True)

    skid_logger.debug("Creating Supervisor object")
    skid_supervisor = Supervisor(handle_errors=False)
    sendgrid_settings = config.SENDGRID_SETTINGS
    sendgrid_settings["api_key"] = sendgrid_api_key
    skid_supervisor.add_message_handler(
        SendGridHandler(
            sendgrid_settings=sendgrid_settings,
            client_name=config.SKID_NAME,
            client_version=version.__version__,
        )
    )

    return skid_supervisor


def _remove_log_file_handlers(log_name, loggers):
    """A helper function to remove the file handlers so the tempdir will close correctly

    Args:
        log_name (str): The log files filename
        loggers (List<str>): The loggers that are writing to log_name
    """

    for logger in loggers:
        for handler in logger.handlers:
            try:
                if log_name in handler.stream.name:
                    logger.removeHandler(handler)
                    handler.close()
            except Exception as error:
                pass


def _get_new_and_updated_records(database_records, agol_records):
    """A helper function to get the new and updated records between two dataframes

    Args:
        dataframe1 (DataFrame): The first dataframe to compare
        dataframe2 (DataFrame): The second dataframe to compare

    Returns:
        (updated_records, new_records): A tuple of the updated and new records (DataFrame, DataFrame)
    """

    #: Get the new records
    new_records = database_records[
        ~database_records.index.isin(agol_records.index)
    ].copy()
    new_records["OBJECTID"] = -1

    #: Get the updated records
    existing_database_records = database_records[
        database_records.index.isin(agol_records.index)
    ].copy()

    #: make a copies so that we can compare WKT values and round timestamps
    existing_database_records_copy = _get_normalized_copy(existing_database_records)
    agol_records_copy = _get_normalized_copy(agol_records)
    agol_records_copy.drop(["OBJECTID"], axis=1, inplace=True)
    if "Shape__Length" in agol_records_copy.columns:
        agol_records_copy.drop(["Shape__Length"], axis=1, inplace=True)
    #: comparing nans is weird in pandas: https://github.com/pandas-dev/pandas/issues/38063
    updated_records = agol_records[
        ~(
            existing_database_records_copy.eq(agol_records_copy)
            | existing_database_records_copy.isna() & agol_records_copy.isna()
        ).all(axis=1)
    ]
    updated_records.update(existing_database_records)

    return (new_records, updated_records)


def _round_coordinates(geometry):
    """A helper function to round the coordinates of a geometry

    Args:
        geometry (Geometry): The geometry to round

    Returns:
        Geometry: The rounded geometry
    """

    decimal_places = 4
    if geometry.geometry_type == "point":
        return arcgis.geometry.Point(
            {
                "x": round(geometry.x, decimal_places),
                "y": round(geometry.y, decimal_places),
                "spatialReference": geometry.spatial_reference,
            }
        )
    elif geometry.geometry_type == "polyline":
        return arcgis.geometry.Polyline(
            {
                "paths": [
                    [
                        [round(x, decimal_places), round(y, decimal_places)]
                        for x, y in path
                    ]
                    for path in geometry.coordinates()
                ],
                "spatialReference": geometry.spatial_reference,
            }
        )
    else:
        return geometry


def _get_normalized_copy(dataframe):
    normalized = dataframe.copy()
    normalized["SHAPE"] = normalized["SHAPE"].apply(lambda x: _round_coordinates(x).WKT)

    #: dates are rounded differently between postgres and agol
    for column in normalized.select_dtypes(
        include=["datetime64[ns, UTC]", "datetime64[ns]"]
    ):
        normalized[column] = normalized[column].apply(lambda x: x.ctime())

    #: empty comments come in as '' from agol but None from postgres
    #: comparing Nones in pandas dataframes is weird: https://github.com/pandas-dev/pandas/issues/20442
    #: so I just replace them with pd.NA
    normalized.replace({"": np.nan, None: np.nan, "None": np.nan}, inplace=True)

    return normalized


def process():
    """The main function that does all the work."""

    #: Set up secrets, tempdir, supervisor, and logging
    start = datetime.datetime.now()

    secrets = SimpleNamespace(**_get_secrets())

    with TemporaryDirectory() as tempdir:
        tempdir_path = Path(tempdir)
        log_name = f'{config.LOG_FILE_NAME}_{start.strftime("%Y%m%d-%H%M%S")}.txt'
        log_path = tempdir_path / log_name

        skid_supervisor = _initialize(log_path, secrets.SENDGRID_API_KEY)
        module_logger = logging.getLogger(config.SKID_NAME)

        gis = arcgis.gis.GIS(
            username=secrets.AGOL_USER,
            password=secrets.AGOL_PASSWORD,
            # proxy_host="127.0.0.1",
            # proxy_port=8080,
            # verify_cert=False,
        )
        loader = PostgresLoader(
            secrets.HOST,
            secrets.DATABASE,
            secrets.DATABASE_USER,
            secrets.DATABASE_PASSWORD,
            secrets.PORT,
        )

        additional_summary_rows = []
        for table, id_column, geog_column in config.TABLES:
            module_logger.info(f"Processing {table}...")

            #: get data from database
            database_records = loader.read_table_into_dataframe(
                f"public.{table}", id_column, "4326", geog_column
            )
            # database_records.rename(columns={geog_column: "SHAPE"}, inplace=True)
            module_logger.info(f"Database records count: {len(database_records)}")
            module_logger.debug(f"database_records dtypes: {database_records.dtypes}")

            search_results = gis.content.search(
                query=f"owner:{secrets.AGOL_USER} AND title:{table} AND type:Feature Service"
                # query=f"owner:{secrets.AGOL_USER} AND title:{table}"
            )
            if len(search_results) == 0:
                #: this code will only work if you have arcpy installed...
                module_logger.info("Publishing to AGOL...")
                database_records.reset_index(inplace=True)
                database_records.spatial.to_featurelayer(title=table, gis=gis)

                continue

            item = search_results[0]
            layer = item.layers[0]
            agol_records = layer.query().sdf
            agol_records.set_index(id_column, inplace=True)
            module_logger.info(f"AGOL records count: {len(agol_records)}")
            module_logger.debug(f"agol_records dtypes: {agol_records.dtypes}")

            new_records, updated_records = _get_new_and_updated_records(
                database_records, agol_records
            )
            module_logger.info(f"New records count: {len(new_records)}")
            module_logger.info(f"Updated records count: {len(updated_records)}")

            if len(new_records) == 0 and len(updated_records) == 0:
                module_logger.info("No changes detected, skipping...")
                continue

            edits = pd.concat([new_records, updated_records], axis=0)
            edits.reset_index(inplace=True)
            updater = FeatureServiceInlineUpdater(gis, edits, "OBJECTID")
            updater.upsert_new_data_in_hosted_feature_layer(item.id, 0)

            additional_summary_rows.append(
                f"{table} database records: {len(database_records)}, agol records: {len(agol_records)}, new records: {len(new_records)}, updated records: {len(updated_records)}"
            )

        end = datetime.datetime.now()

        summary_message = MessageDetails()
        summary_message.subject = f"{config.SKID_NAME} Update Summary"
        summary_rows = [
            f'{config.SKID_NAME} update {start.strftime("%Y-%m-%d")}',
            "=" * 20,
            "",
            f'Start time: {start.strftime("%H:%M:%S")}',
            f'End time: {end.strftime("%H:%M:%S")}',
            f"Duration: {str(end-start)}",
        ] + additional_summary_rows

        summary_message.message = "\n".join(summary_rows)
        summary_message.attachments = tempdir_path / log_name

        skid_supervisor.notify(summary_message)

        #: Remove file handler so the tempdir will close properly
        loggers = [logging.getLogger(config.SKID_NAME), logging.getLogger("palletjack")]
        _remove_log_file_handlers(log_name, loggers)


def main(event, context):  # pylint: disable=unused-argument
    """Entry point for Google Cloud Function triggered by pub/sub event

    Args:
         event (dict):  The dictionary with data specific to this type of
                        event. The `@type` field maps to
                         `type.googleapis.com/google.pubsub.v1.PubsubMessage`.
                        The `data` field maps to the PubsubMessage data
                        in a base64-encoded string. The `attributes` field maps
                        to the PubsubMessage attributes if any is present.
         context (google.cloud.functions.Context): Metadata of triggering event
                        including `event_id` which maps to the PubsubMessage
                        messageId, `timestamp` which maps to the PubsubMessage
                        publishTime, `event_type` which maps to
                        `google.pubsub.topic.publish`, and `resource` which is
                        a dictionary that describes the service API endpoint
                        pubsub.googleapis.com, the triggering topic's name, and
                        the triggering event type
                        `type.googleapis.com/google.pubsub.v1.PubsubMessage`.
    Returns:
        None. The output is written to Cloud Logging.
    """

    #: This function must be called 'main' to act as the Google Cloud Function entry point. It must accept the two
    #: arguments listed, but doesn't have to do anything with them (I haven't used them in anything yet).

    #: Call process() and any other functions you want to be run as part of the skid here.
    process()


#: Putting this here means you can call the file via `python main.py` and it will run. Useful for pre-GCF testing.
if __name__ == "__main__":
    process()
