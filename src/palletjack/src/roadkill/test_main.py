import arcgis
import geopandas as gpd
import numpy as np
import pandas as pd

from . import main

agol_records = gpd.read_file(gpd.datasets.get_path("naturalearth_lowres"))
agol_records = pd.DataFrame.spatial.from_geodataframe(agol_records, column_name="SHAPE")
agol_records.rename(columns={"geometry": "SHAPE"}, inplace=True)
agol_records["submit_date"] = pd.Timestamp("2020-01-01 00:00:00.123")
agol_records["OBJECTID"] = agol_records.index


def test_get_new_and_updated_records_spatial():
    database_records = agol_records.copy()
    database_records.drop(columns=["OBJECTID"], inplace=True)

    #: change existing row
    database_records.loc[1, "name"] = "Changed"
    #: add new row
    database_records.loc[len(database_records.index)] = [
        100_000.0,
        "North America",
        "A new island",
        "SSD",
        1234,
        database_records.loc[0]["SHAPE"],
        pd.Timestamp("2020-01-01 00:00:00.123"),
    ]

    new_records, updated_records = main._get_new_and_updated_records(
        database_records, agol_records
    )

    assert len(new_records) == 1
    pd.testing.assert_frame_equal(
        new_records.head(1).drop(["OBJECTID"], axis=1), database_records.tail(1)
    )

    assert len(updated_records) == 1
    pd.testing.assert_series_equal(
        updated_records.iloc[0].drop(["OBJECTID"]), database_records.loc[1]
    )

    #: make sure that it preserved the geometry
    assert updated_records.loc[1, "SHAPE"].type == "Polygon"

    #: should preserve the OBJECTID for changed rows
    assert updated_records.loc[1, "OBJECTID"] == 1

    #: should set the OBJECTID for new rows
    assert new_records.iloc[0]["OBJECTID"] == -1


def test_get_new_and_updated_records_time():
    unchanged = agol_records.copy()
    unchanged.drop(columns=["OBJECTID"], inplace=True)
    unchanged["submit_date"] = pd.Timestamp("2020-01-01 00:00:00.12300005")

    new_records, updated_records = main._get_new_and_updated_records(
        unchanged, agol_records
    )

    assert len(new_records) == 0
    assert len(updated_records) == 0


def test_get_new_and_updated_records_empties():
    database_records = agol_records.copy()
    database_records.drop(columns=["OBJECTID"], inplace=True)
    database_records["nones"] = None
    database_records["nans"] = np.nan

    unchanged = database_records.copy()
    unchanged["nones"] = ""

    new_records, updated_records = main._get_new_and_updated_records(
        unchanged, database_records
    )

    assert len(new_records) == 0
    assert len(updated_records) == 0


def test_round_coordinates():
    input = arcgis.geometry.Point(
        {
            "x": -12449574.215541115,
            "y": 4965981.710786081,
            "spatialReference": {"wkid": 3857},
        }
    )

    output = main._round_coordinates(input)

    assert output.x == -12449574.2155
    assert output.y == 4965981.7108
