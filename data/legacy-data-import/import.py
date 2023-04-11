import pickle
from datetime import datetime

import numpy as np
import pandas as pd
import sqlalchemy
from models import PickupReports, ReportInfos, Users
from sqlalchemy.orm import Session
from tqdm import tqdm

url = sqlalchemy.engine.url.URL.create(
    drivername="postgresql",
    username="",
    password="",
    database="",
    host="127.0.0.1",
    port=5433,
)
print(url)
engine = sqlalchemy.create_engine(url)

csv_file_path = r"...csv"
legacy_txt = "<legacy-db>"
imported_txt = "<imported from legacy database>"
imported_indexes_file = "imported_indexes.pkl"


def get_date(value):
    return None if value is None else datetime.fromisoformat(value)


def unknown_if_none(value):
    return "unknown" if value is None else value


user_ids_cache = {}

try:
    successfully_imported_indexes = pickle.load(open(imported_indexes_file, "rb"))
except FileNotFoundError:
    successfully_imported_indexes = []

subsequent_errors = 0
imported = 0
unknown_user_id = 2464


def get_user_id(row):
    if row.user_id is not None:
        return row.user_id
    elif row.email is not None:
        return user_ids_cache.get(row.email, unknown_user_id)
    else:
        return unknown_user_id  # unknown user


with Session(engine) as session:
    df = pd.read_csv(csv_file_path)
    df.replace({np.nan: None}, inplace=True)
    for i, row in tqdm(df.iterrows(), total=len(df)):
        if i in successfully_imported_indexes:
            continue
        with session.begin():
            try:
                user_id = get_user_id(row)
                if user_id is None:
                    # create new user
                    user = Users(
                        role="agency"
                        if row.email is not None and row.email.endswith("utah.gov")
                        else "contractor",
                        auth_provider="utahid",
                        auth_id=legacy_txt,
                        email=row.email if row.email is not None else legacy_txt,
                        first_name=row.first_name
                        if row.first_name is not None
                        else legacy_txt,
                        last_name=row.last_name
                        if row.last_name is not None
                        else legacy_txt,
                        registered_date=datetime.now(),
                        last_logged_in=datetime.now(),
                        phone=legacy_txt,
                        organization_id=row.organization_id,
                        approved=False,
                        approved_date=None,
                    )

                    session.add(user)
                    session.flush()  # flush to get the user id

                    user_ids_cache[row.email] = user.id
                    user_id = user.id
                    # print(f"created user {user.id}")

                report_info = ReportInfos(
                    user_id=user_id,
                    animal_location=row.animal_location,
                    submit_location=row.animal_location,
                    submit_date=get_date(row.submit_date),
                    common_name=unknown_if_none(row.common_name),
                    scientific_name=unknown_if_none(row.scientific_name),
                    species_type=unknown_if_none(row.species_type),
                    species_class=unknown_if_none(row.species_class),
                    family=unknown_if_none(row.family),
                    species_id=row.species_id,
                    species_order=unknown_if_none(row.species_order),
                    sex=row.sex,
                    age_class=row.age_class,
                    comments=f"{row.comments} - {imported_txt}"
                    if row.comments is not None
                    else imported_txt,
                )

                session.add(report_info)
                session.flush()  # flush to get the report id
                # print(f"created report {report_info.report_id}")

                pickup = PickupReports(
                    report_id=report_info.report_id,
                    pickup_date=get_date(row.pickup_date),
                )

                session.add(pickup)

                successfully_imported_indexes.append(i)

                imported += 1
                subsequent_errors = 0
            except Exception as e:
                print(f"error: {e}")
                print(row)

                subsequent_errors += 1

                if subsequent_errors > 1000:
                    print("too many errors, exiting")
                    break

            if i % 100 == 0:
                pickle.dump(
                    successfully_imported_indexes, open(imported_indexes_file, "wb")
                )

pickle.dump(successfully_imported_indexes, open(imported_indexes_file, "wb"))

print(f"imported {imported} records")
print(f"unimported records {len(df) - len(successfully_imported_indexes)}")
