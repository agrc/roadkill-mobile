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
from supervisor.message_handlers import SendGridHandler
from supervisor.models import MessageDetails, Supervisor

from palletjack import extract, load, transform

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
        #: staging
        # return json.loads((secret_folder / "secrets.json").read_text(encoding="utf-8"))
        #: prod
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
            except Exception:
                pass


def _get_new_and_deleted_records(database_records, agol_records):
    """A helper function to get the new and deleted records between two dataframes

    Args:
        database_records (DataFrame): Data from the database
        agol_records (DataFrame): Data from AGOL

    Returns:
        (updated_records, deleted_ids): A tuple of the updated records and deleted objectids (DataFrame, List<int>)
    """

    new_records = database_records[
        ~database_records.index.isin(agol_records.index)
    ].copy()
    new_records["OBJECTID"] = range(-1, -len(new_records) - 1, -1)

    deleted_records = agol_records[
        ~agol_records.index.isin(database_records.index)
    ].copy()
    deleted_ids = deleted_records["OBJECTID"].tolist()

    return (new_records, deleted_ids)


def _transform(dataframe, int_fields, date_fields):
    """A helper function to prepare the dataframe to be loaded into AGOL

    Args:
        dataframe (DataFrame): The dataframe to be transformed
        int_fields (List<str>): The fields that should be converted to int
        date_fields (List<str>): The fields that should be converted to datetime
    """
    dataframe.reset_index(inplace=True)
    dataframe.spatial.set_geometry("SHAPE")
    dataframe.spatial.project(4326)
    dataframe.spatial.sr = {"wkid": 4326}
    dataframe.spatial.set_geometry("SHAPE")

    renamed_df = transform.DataCleaning.rename_dataframe_columns_for_agol(dataframe)
    floats_df = transform.DataCleaning.switch_to_float(renamed_df, int_fields)
    dates_df = transform.DataCleaning.switch_to_datetime(floats_df, date_fields)

    return dates_df


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
        try:
            port = secrets.PORT
        except AttributeError:
            port = 5432

        loader = extract.PostgresLoader(
            secrets.HOST,
            secrets.DATABASE,
            secrets.DATABASE_USER,
            secrets.DATABASE_PASSWORD,
            port,
        )

        additional_summary_rows = []
        for table, id_column, geog_column, int_fields, date_fields in config.TABLES:
            module_logger.info("Processing %s ...", table)

            #: get data from database
            database_records = loader.read_table_into_dataframe(
                f"public.{table}", id_column, "4326", geog_column
            )
            database_records.rename(columns={geog_column: "SHAPE"}, inplace=True)
            module_logger.info("Database records count: %s", len(database_records))

            search_results = gis.content.search(
                query=f'owner:{secrets.AGOL_USER} AND title:"{table}" AND type:Feature Service'
            )
            if len(search_results) == 0:
                #: this code will only work if you have arcpy installed...
                module_logger.info("Publishing to AGOL...")
                prepared_df = _transform(database_records, int_fields, date_fields)
                prepared_df.spatial.to_featurelayer(title=table, gis=gis)

                continue

            item = [r for r in search_results if r.title == table][0]
            layer = item.layers[0]
            agol_records = layer.query().sdf
            agol_records.set_index(id_column, inplace=True)
            module_logger.info("AGOL records count: %s", len(agol_records))

            new_records, deleted_ids = _get_new_and_deleted_records(
                database_records, agol_records
            )
            module_logger.info("New records count: %s", len(new_records))
            module_logger.info("Deleted records count: %s", len(deleted_ids))

            if len(new_records) > 0:
                module_logger.info("Adding new records to AGOL...")
                prepared_df = _transform(new_records, int_fields, date_fields)
                if table == "agol_public_reports":
                    prepared_df["repeat_submission"] = prepared_df[
                        "repeat_submission"
                    ].astype("int")
                updates = load.FeatureServiceUpdater.add_features(
                    gis, item.id, prepared_df
                )
                module_logger.info("Added %s records", updates)

            if len(deleted_ids) > 0:
                module_logger.info("Deleting records...")
                deleted = load.FeatureServiceUpdater.remove_features(
                    gis, item.id, deleted_ids
                )
                module_logger.info("Deleted %s records", deleted)

            additional_summary_rows.append(
                f"{table} database records: {len(database_records)}, agol records: {len(agol_records)}, new records: {len(new_records)}, deleted records: {len(deleted_ids)}"
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
