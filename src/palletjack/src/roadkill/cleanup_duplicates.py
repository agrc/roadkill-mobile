"""Remove duplicate logical records from Roadkill AGOL feature layers.

Run without --execute to preview. Deletions retain the lowest OBJECTID for each
configured business key and refuse layers that support feature attachments.

This is a one-off script to clean up the Roadkill AGOL feature layers. I'm leaving it here in case we need to run it again, but it should not be used as part of the normal workflow.
"""

import argparse
from collections import defaultdict
from itertools import islice

import arcgis

from . import config
from .main import _get_secrets

DELETE_BATCH_SIZE = 500


def _chunks(values, size):
    iterator = iter(values)
    while batch := list(islice(iterator, size)):
        yield batch


def _get_layer(gis, table):
    results = gis.content.search(query=f'owner:{gis.users.me.username} AND title:"{table}" AND type:Feature Service')
    matches = [result for result in results if result.title == table]
    if len(matches) != 1:
        raise RuntimeError(f"Expected exactly one Feature Service titled {table}; found {len(matches)}")

    return matches[0].layers[0]


def _get_duplicate_object_ids(layer, id_column):
    object_id_field = layer.properties.objectIdField
    max_record_count = layer.properties.maxRecordCount
    object_ids_by_key = defaultdict(list)
    offset = 0

    while True:
        print(f"Querying {layer.properties.name} for {id_column} duplicates, offset {offset}")
        result = layer.query(
            where="1=1",
            out_fields=f"{object_id_field},{id_column}",
            return_geometry=False,
            result_offset=offset,
            result_record_count=max_record_count,
        )
        features = result.features
        if not features:
            break

        for feature in features:
            attributes = feature.attributes
            key = attributes[id_column]
            if key is None:
                raise RuntimeError(f"Found a null {id_column} in {layer.properties.name}")
            object_ids_by_key[key].append(attributes[object_id_field])

        offset += len(features)
        if len(features) < max_record_count:
            break

    duplicate_groups = {
        key: sorted(object_ids) for key, object_ids in object_ids_by_key.items() if len(object_ids) > 1
    }
    duplicate_object_ids = [object_id for object_ids in duplicate_groups.values() for object_id in object_ids[1:]]
    return duplicate_groups, duplicate_object_ids


def _delete_duplicate_object_ids(layer, object_ids):
    for batch in _chunks(object_ids, DELETE_BATCH_SIZE):
        result = layer.delete_features(deletes=",".join(map(str, batch)), rollback_on_failure=True)
        failures = [delete for delete in result["deleteResults"] if not delete["success"]]
        if failures:
            raise RuntimeError(f"Failed to delete features: {failures}")


def cleanup_table(gis, table, id_column, execute):
    layer = _get_layer(gis, table)
    if execute and layer.properties.hasAttachments:
        raise RuntimeError(
            f"{table} supports attachments; inspect or migrate them before deleting duplicate features."
        )

    duplicate_groups, duplicate_object_ids = _get_duplicate_object_ids(layer, id_column)
    print(
        f"{table}: {len(duplicate_groups)} duplicate {id_column} groups; "
        f"{len(duplicate_object_ids)} features "
        f"{'will be deleted' if execute else 'would be deleted'}"
    )

    if not execute or not duplicate_object_ids:
        return len(duplicate_object_ids)

    _delete_duplicate_object_ids(layer, duplicate_object_ids)
    remaining_groups, remaining_object_ids = _get_duplicate_object_ids(layer, id_column)
    if remaining_groups:
        raise RuntimeError(f"{table} still has {len(remaining_groups)} duplicate groups after deletion")
    if remaining_object_ids:
        raise RuntimeError(f"{table} still has {len(remaining_object_ids)} duplicate features after deletion")

    print(f"{table}: deleted {len(duplicate_object_ids)} duplicate features")
    return len(duplicate_object_ids)


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--table",
        choices=[table[0] for table in config.TABLES],
        action="append",
        help="Target table to clean. Repeat to clean multiple tables. Defaults to every configured table.",
    )
    parser.add_argument("--execute", action="store_true", help="Delete duplicates. Omit for a dry run.")
    parser.add_argument(
        "--confirm",
        action="append",
        default=[],
        help="Required with --execute for every selected table. Repeat once per --table value.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    selected_tables = set(args.table or [table[0] for table in config.TABLES])

    if args.execute and selected_tables != set(args.confirm):
        raise SystemExit("--execute requires --confirm for every selected --table value")

    secrets = _get_secrets()
    gis = arcgis.gis.GIS(
        username=secrets["AGOL_USER"],
        password=secrets["AGOL_PASSWORD"],
        url=secrets["AGOL_ORG"],
        expiration=9999,
    )

    total = 0
    for table, id_column, *_ in config.TABLES:
        if table in selected_tables:
            total += cleanup_table(gis, table, id_column, args.execute)

            print(f"{total} duplicate features {'deleted' if args.execute else 'identified'}")


if __name__ == "__main__":
    main()
