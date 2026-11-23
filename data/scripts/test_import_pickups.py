import csv
import tempfile
import unittest
from datetime import UTC
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import import_pickups

HEADERS = [
    "id",
    "submit_date",
    "pickup_date",
    "animal_latitude",
    "animal_longitude",
    "common_name",
    "sex",
    "age_class",
    "user_id",
    "",
]
ROW = [
    "0",
    "2025-04-20 00:00:00+00:00",
    "2024-12-08 00:00:00+00:00",
    "37.70231108",
    "-112.1981752",
    "Pronghorn Antelope",
    "female",
    "adult",
    "1225",
    "",
]
SPECIES = (8, "Pronghorn Antelope", "Antilocapra americana", "wild", "mammals", "hoofed animals", "antelope")


class ImportPickupsTest(unittest.TestCase):
    def csv_file(self, rows, headers=HEADERS):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        path = Path(directory.name) / "pickups.csv"
        with path.open("w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow(headers)
            writer.writerows(rows)
        return path

    def test_calendar_dates_are_denver_midnights_with_dst(self):
        pickup = import_pickups.read_pickups(self.csv_file([ROW]))[0]
        self.assertEqual(
            import_pickups.denver_midnight(pickup.submit_date).astimezone(UTC).isoformat(),
            "2025-04-20T06:00:00+00:00",
        )
        self.assertEqual(
            import_pickups.denver_midnight(pickup.pickup_date).astimezone(UTC).isoformat(),
            "2024-12-08T07:00:00+00:00",
        )

    def test_rejects_non_midnight_and_duplicate_source_ids(self):
        invalid = ROW.copy()
        invalid[1] = "2025-04-20 03:00:00+00:00"
        with self.assertRaisesRegex(ValueError, "midnight"):
            import_pickups.read_pickups(self.csv_file([invalid]))
        with self.assertRaisesRegex(ValueError, "duplicate source id"):
            import_pickups.read_pickups(self.csv_file([ROW, ROW]))

    def test_rejects_invalid_coordinates_and_extra_fields(self):
        invalid = ROW.copy()
        invalid[3] = "NaN"
        with self.assertRaisesRegex(ValueError, "invalid latitude"):
            import_pickups.read_pickups(self.csv_file([invalid]))
        invalid = ROW.copy()
        invalid[-1] = "unexpected"
        with self.assertRaisesRegex(ValueError, "unexpected or missing"):
            import_pickups.read_pickups(self.csv_file([invalid]))
        invalid = ROW.copy()
        invalid[6] = "black"
        invalid[7] = "beef"
        with self.assertRaisesRegex(ValueError, "invalid sex"):
            import_pickups.read_pickups(self.csv_file([invalid]))

    def test_import_ledger_skips_same_row_and_rejects_changed_row(self):
        pickup = import_pickups.read_pickups(self.csv_file([ROW]))[0]
        cursor = Mock()
        cursor.fetchall.side_effect = [
            [(1225,)],
            [SPECIES],
            [("0", pickup.fingerprint(), 42)],
        ]
        cursor.fetchone.return_value = ("pickup_import_records",)
        pending, skipped, conflicts = import_pickups.prepare_import(cursor, [pickup], "batch")
        self.assertEqual((pending, skipped, conflicts), ([], 1, []))

        cursor.fetchall.side_effect = [[(1225,)], [SPECIES], [("0", "changed", 42)]]
        with self.assertRaisesRegex(ValueError, "previously imported data differs"):
            import_pickups.prepare_import(cursor, [pickup], "batch")

    def test_duplicate_detection_and_missing_user(self):
        pickup = import_pickups.read_pickups(self.csv_file([ROW]))[0]
        cursor = Mock()
        cursor.fetchall.side_effect = [[(1225,)], [SPECIES]]
        cursor.fetchone.side_effect = [(None,), (99,)]
        pending, skipped, conflicts = import_pickups.prepare_import(cursor, [pickup], "batch")
        self.assertEqual(len(pending), 1)
        self.assertEqual(skipped, 0)
        self.assertEqual(conflicts, ["source id 0 matches existing report id 99"])

        cursor.fetchall.side_effect = [[], [SPECIES]]
        cursor.fetchone.side_effect = [(None,)]
        with self.assertRaisesRegex(ValueError, "user_id does not exist"):
            import_pickups.prepare_import(cursor, [pickup], "batch")

    def test_sex_and_age_class_distinguish_duplicate_reports(self):
        male_adult = ROW.copy()
        male_adult[0] = "216"
        male_adult[6] = "male"
        female_adult = ROW.copy()
        female_adult[0] = "217"
        female_adult[6] = "female"
        female_juvenile = ROW.copy()
        female_juvenile[0] = "218"
        female_juvenile[6] = "female"
        female_juvenile[7] = "juvenile"
        pickups = import_pickups.read_pickups(
            self.csv_file([male_adult, female_adult, female_juvenile])
        )
        cursor = Mock()
        cursor.fetchall.side_effect = [[(1225,)], [SPECIES]]
        cursor.fetchone.side_effect = [(None,), None, None, None]

        pending, skipped, conflicts = import_pickups.prepare_import(cursor, pickups, "batch")

        self.assertEqual(len(pending), 3)
        self.assertEqual(skipped, 0)
        self.assertEqual(conflicts, [])
        duplicate_queries = [
            call
            for call in cursor.execute.call_args_list
            if "SELECT r.report_id" in call.args[0]
        ]
        self.assertTrue(
            all(
                "r.sex IS NOT DISTINCT FROM %s" in call.args[0]
                and "r.age_class IS NOT DISTINCT FROM %s" in call.args[0]
                for call in duplicate_queries
            )
        )
        self.assertEqual(
            [call.args[1][2:4] for call in duplicate_queries],
            [("male", "adult"), ("female", "adult"), ("female", "juvenile")],
        )

    def test_insert_uses_same_coordinates_and_records_ledger(self):
        pickup = import_pickups.read_pickups(self.csv_file([ROW]))[0]
        cursor = Mock()
        cursor.fetchone.return_value = (42,)
        import_pickups.insert_pickups(cursor, [(pickup, SPECIES)], "batch")
        calls = cursor.execute.call_args_list
        values = calls[1].args[1]
        self.assertEqual(values[1:5], (-112.1981752, 37.70231108, -112.1981752, 37.70231108))
        self.assertEqual(calls[2].args[1][0], 42)
        self.assertEqual(calls[3].args[1], ("batch", "0", pickup.fingerprint(), 42))

    def test_dry_run_never_inserts_or_commits(self):
        path = self.csv_file([ROW])
        connection = Mock()
        connection.cursor.return_value = MagicMock()
        cursor = connection.cursor.return_value.__enter__.return_value
        cursor.fetchone.return_value = ("app", "editor", "127.0.0.1", 5432)
        with (
            patch("sys.argv", ["import_pickups.py", str(path), "--batch-id", "batch"]),
            patch.dict(
                "sys.modules",
                {"psycopg2": Mock(connect=Mock(return_value=connection))},
            ),
            patch("import_pickups.prepare_import", return_value=([(Mock(), SPECIES)], 0, [])),
            patch("import_pickups.insert_pickups") as insert,
        ):
            self.assertEqual(import_pickups.main(), 0)
        connection.set_session.assert_called_once_with(readonly=True)
        connection.rollback.assert_called_once()
        connection.commit.assert_not_called()
        insert.assert_not_called()


if __name__ == "__main__":
    unittest.main()
