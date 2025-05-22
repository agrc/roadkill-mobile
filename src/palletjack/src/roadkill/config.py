"""
config.py: Configuration values. Secrets to be handled with Secrets Manager
"""

import logging
import os

SKID_NAME = "roadkill"

SENDGRID_SETTINGS = {  #: Settings for SendGridHandler
    "from_address": "noreply@utah.gov",
    "to_addresses": "stdavis@utah.gov",
    "prefix": f"{os.getenv('PROJECT_ID')}: ",
}
LOG_LEVEL = logging.DEBUG
LOG_FILE_NAME = "log"

TABLES = [
    #: ('table_name', 'id_column', 'geog_column', 'int_fields', 'date_fields')
    (
        "agol_pickup_reports",
        "report_id",
        "animal_location",
        ["report_id", "species_id", "user_id"],
        ["submit_date", "pickup_date"],
    ),
    (
        "agol_public_reports",
        "report_id",
        "animal_location",
        ["report_id", "species_id", "user_id"],
        ["submit_date", "discovery_date"],
    ),
    (
        "agol_routes",
        "route_id",
        "geog",
        ["route_id", "user_id"],
        ["start_time", "end_time", "submit_date"],
    ),
]
