"""
Import date-only pickup reports; run with --help for usage.

This is a one-time import script for a CSV file that was sent to use from DWR in Nov 2026.

"""

import argparse
import csv
import hashlib
import json
import math
import sys
from dataclasses import asdict, dataclass
from datetime import UTC, date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from tqdm import tqdm

DENVER = ZoneInfo("America/Denver")
COLUMNS = {
    "id",
    "submit_date",
    "pickup_date",
    "animal_latitude",
    "animal_longitude",
    "common_name",
    "sex",
    "age_class",
    "user_id",
}


@dataclass(frozen=True)
class Pickup:
    source_id: str
    submit_date: str
    pickup_date: str
    latitude: float
    longitude: float
    common_name: str
    sex: str | None
    age_class: str | None
    user_id: int

    def fingerprint(self):
        data = json.dumps(asdict(self), sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(data.encode("utf-8")).hexdigest()


def calendar_date(value):
    value = value.strip()
    if len(value) == 10:
        day = date.fromisoformat(value)
    else:
        stamp = datetime.fromisoformat(value)
        if stamp.tzinfo is None or stamp.utcoffset() != timedelta(0) or stamp.time() != time.min:
            raise ValueError("expected a date or midnight timestamp with a UTC offset")
        day = stamp.date()
    return day.isoformat()


def denver_midnight(day):
    return datetime.combine(date.fromisoformat(day), time.min, tzinfo=DENVER)


def optional_enum(value, allowed, name):
    value = value.strip().lower()
    if value and value not in allowed:
        raise ValueError(f"invalid {name}: {value!r}")
    return value or None


def read_pickups(path):
    pickups = []
    seen = set()
    with path.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        headers = reader.fieldnames
        if not headers or len(headers) != len(set(headers)):
            raise ValueError("CSV has missing or duplicate column names")
        if set(headers) - {""} != COLUMNS:
            raise ValueError(f"CSV must have these columns: {', '.join(sorted(COLUMNS))}")

        for row in reader:
            try:
                if None in row or any(value is None for value in row.values()) or row.get("", ""):
                    raise ValueError("unexpected or missing CSV fields")
                source_id = row["id"].strip()
                if not source_id or source_id in seen:
                    raise ValueError("missing or duplicate source id")
                user_id = int(row["user_id"])
                if user_id <= 0:
                    raise ValueError("user_id must be positive")
                latitude = float(row["animal_latitude"])
                longitude = float(row["animal_longitude"])
                if not math.isfinite(latitude) or not -90 <= latitude <= 90:
                    raise ValueError("invalid latitude")
                if not math.isfinite(longitude) or not -180 <= longitude <= 180:
                    raise ValueError("invalid longitude")
                common_name = row["common_name"].strip()
                if not common_name:
                    raise ValueError("missing common_name")
                pickup = Pickup(
                    source_id=source_id,
                    submit_date=calendar_date(row["submit_date"]),
                    pickup_date=calendar_date(row["pickup_date"]),
                    latitude=latitude,
                    longitude=longitude,
                    common_name=common_name,
                    sex=optional_enum(row["sex"], {"male", "female", "unknown"}, "sex"),
                    age_class=optional_enum(
                        row["age_class"], {"adult", "juvenile", "unknown"}, "age_class"
                    ),
                    user_id=user_id,
                )
                seen.add(source_id)
                pickups.append(pickup)
            except (TypeError, ValueError) as error:
                raise ValueError(f"CSV line {reader.line_num}: {error}") from error
    if not pickups:
        raise ValueError("CSV contains no pickup reports")
    return pickups


def prepare_import(cursor, pickups, batch_id):
    cursor.execute("SELECT id FROM public.users WHERE id = ANY(%s)", ([p.user_id for p in pickups],))
    user_ids = {row[0] for row in cursor.fetchall()}
    cursor.execute(
        """
        SELECT species_id, common_name, scientific_name, species_type,
               species_class, species_order, family
        FROM public.species
        """
    )
    species = {}
    for row in cursor.fetchall():
        species.setdefault(row[1].strip().casefold(), []).append(row)

    cursor.execute("SELECT to_regclass('public.pickup_import_records')")
    existing = {}
    if cursor.fetchone()[0] is not None:
        cursor.execute(
            """
            SELECT source_id, fingerprint, report_id
            FROM public.pickup_import_records WHERE batch_id = %s
            """,
            (batch_id,),
        )
        existing = {row[0]: (row[1], row[2]) for row in cursor.fetchall()}

    pending = []
    skipped = 0
    conflicts = []
    seen_pickups = {}
    now = datetime.now(UTC) + timedelta(minutes=1)
    for pickup in tqdm(pickups, desc="Checking destination", unit="report"):
        if pickup.user_id not in user_ids:
            raise ValueError(f"source id {pickup.source_id}: user_id does not exist")
        matches = species.get(pickup.common_name.casefold(), [])
        if len(matches) != 1:
            raise ValueError(f"source id {pickup.source_id}: species match is missing or ambiguous")
        if denver_midnight(pickup.submit_date) > now or denver_midnight(pickup.pickup_date) > now:
            raise ValueError(f"source id {pickup.source_id}: date is in the future")
        if pickup.source_id in existing:
            fingerprint, _ = existing[pickup.source_id]
            if fingerprint != pickup.fingerprint():
                raise ValueError(f"source id {pickup.source_id}: previously imported data differs")
            skipped += 1
            continue
        species_row = matches[0]
        duplicate_key = (
            pickup.user_id,
            species_row[0],
            pickup.pickup_date,
            pickup.latitude,
            pickup.longitude,
            pickup.sex,
            pickup.age_class,
        )
        if duplicate_key in seen_pickups:
            conflicts.append(
                f"source id {pickup.source_id} matches source id {seen_pickups[duplicate_key]} in the CSV"
            )
        else:
            seen_pickups[duplicate_key] = pickup.source_id
        cursor.execute(
            """
            SELECT r.report_id
            FROM public.report_infos r
            JOIN public.pickup_reports p ON p.report_id = r.report_id
            WHERE r.user_id = %s AND r.species_id = %s
              AND r.sex IS NOT DISTINCT FROM %s
              AND r.age_class IS NOT DISTINCT FROM %s
              AND (p.pickup_date AT TIME ZONE 'America/Denver')::date = %s
              AND ST_DWithin(
                    r.animal_location,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
                    0.01
                  )
            LIMIT 1
            """,
            (
                pickup.user_id,
                species_row[0],
                pickup.sex,
                pickup.age_class,
                pickup.pickup_date,
                pickup.longitude,
                pickup.latitude,
            ),
        )
        duplicate = cursor.fetchone()
        if duplicate:
            conflicts.append(
                f"source id {pickup.source_id} matches existing report id {duplicate[0]}"
            )
        pending.append((pickup, species_row))
    return pending, skipped, conflicts


def insert_pickups(cursor, pending, batch_id):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS public.pickup_import_records (
            batch_id text NOT NULL,
            source_id text NOT NULL,
            fingerprint text NOT NULL,
            report_id integer NOT NULL UNIQUE REFERENCES public.report_infos(report_id),
            PRIMARY KEY (batch_id, source_id)
        )
        """
    )
    for pickup, species in tqdm(pending, desc="Inserting reports", unit="report"):
        species_id, common_name, scientific_name, species_type, species_class, species_order, family = (
            species
        )
        cursor.execute(
            """
            INSERT INTO public.report_infos
              (user_id, animal_location, submit_location, submit_date, species_id,
               common_name, scientific_name, species_type, species_class, species_order,
               family, sex, age_class)
            VALUES
              (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
               ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, %s,
               %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING report_id
            """,
            (
                pickup.user_id,
                pickup.longitude,
                pickup.latitude,
                pickup.longitude,
                pickup.latitude,
                denver_midnight(pickup.submit_date),
                species_id,
                common_name,
                scientific_name,
                species_type,
                species_class,
                species_order,
                family,
                pickup.sex,
                pickup.age_class,
            ),
        )
        report_id = cursor.fetchone()[0]
        cursor.execute(
            "INSERT INTO public.pickup_reports (report_id, pickup_date) VALUES (%s, %s)",
            (report_id, denver_midnight(pickup.pickup_date)),
        )
        cursor.execute(
            """
            INSERT INTO public.pickup_import_records (batch_id, source_id, fingerprint, report_id)
            VALUES (%s, %s, %s, %s)
            """,
            (batch_id, pickup.source_id, pickup.fingerprint(), report_id),
        )


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        epilog=(
            "Configure the connection using standard PGHOST, PGPORT, PGDATABASE, PGUSER "
            "and secure libpq authentication. Dry runs are read-only. Verify the destination, "
            "review duplicates, test in staging, and confirm a backup before using --execute. "
            "Dates are interpreted as Denver calendar dates; submit location equals animal "
            "location. The script creates public.pickup_import_records for retry tracking; "
            "use the same batch ID for every retry. A different batch ID bypasses that "
            "tracking. Duplicate checks are not exhaustive. The ledger references reports "
            "and must be retained for reconciliation or a carefully planned rollback."
        ),
    )
    parser.add_argument("csv_file", type=Path)
    parser.add_argument("--batch-id", required=True, help="Stable, unique ID for this dataset")
    parser.add_argument("--execute", action="store_true", help="Commit changes; default is dry run")
    parser.add_argument(
        "--allow-existing",
        action="store_true",
        help="Allow potential duplicates found in the destination database",
    )
    args = parser.parse_args()
    if not args.batch_id.strip():
        parser.error("--batch-id must not be empty")

    try:
        pickups = read_pickups(args.csv_file)
        import psycopg2

        connection = psycopg2.connect("")
        try:
            if not args.execute:
                connection.set_session(readonly=True)
            with connection.cursor() as cursor:
                if args.execute:
                    cursor.execute("SELECT pg_advisory_xact_lock(hashtext('roadkill-pickup-import'))")
                cursor.execute("SELECT current_database(), current_user, inet_server_addr(), inet_server_port()")
                database, user, host, port = cursor.fetchone()
                print(f"Database: {database}; user: {user}; server: {host}:{port}")
                pending, skipped, conflicts = prepare_import(cursor, pickups, args.batch_id)
                print(f"Batch: {args.batch_id}; total: {len(pickups)}; new: {len(pending)}; already imported: {skipped}")
                for conflict in conflicts:
                    print(f"Potential duplicate: {conflict}")
                if conflicts and not args.allow_existing:
                    raise ValueError("potential duplicates found; review before using --allow-existing")
                if args.execute and pending:
                    insert_pickups(cursor, pending, args.batch_id)
                    connection.commit()
                    print(f"Committed {len(pending)} pickup reports.")
                else:
                    connection.rollback()
                    print("No changes committed.")
        finally:
            connection.close()
    except (OSError, ValueError, ImportError) as error:
        print(f"Import failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
