import pandas as pd

from . import main


def test_get_new_and_updated_records():
    database_records = pd.DataFrame(
        {
            "report_id": [1, 3, 4],
            "dummy": ["a", "c", "d"],
        }
    )
    database_records.set_index("report_id", inplace=True)
    agol_records = pd.DataFrame(
        {
            "report_id": [1, 2, 3],
            "OBJECTID": [10, 20, 30],
            "dummy": ["a", "b", "c"],
        }
    )
    agol_records.set_index("report_id", inplace=True)

    new_records, deleted_ids = main._get_new_and_deleted_records(
        database_records, agol_records
    )

    assert len(new_records) == 1
    assert new_records.loc[4].tolist() == ["d", 1]

    assert len(deleted_ids) == 1
    assert deleted_ids[0] == 20
