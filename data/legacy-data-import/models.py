from geoalchemy2.types import Geography
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Enum,
    ForeignKeyConstraint,
    Index,
    Integer,
    PrimaryKeyConstraint,
    String,
    Table,
    text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()
metadata = Base.metadata


class KnexMigrations(Base):
    __tablename__ = "knex_migrations"
    __table_args__ = (PrimaryKeyConstraint("id", name="knex_migrations_pkey"),)

    id = Column(Integer)
    name = Column(String(255))
    batch = Column(Integer)
    migration_time = Column(DateTime(True))


class KnexMigrationsLock(Base):
    __tablename__ = "knex_migrations_lock"
    __table_args__ = (PrimaryKeyConstraint("index", name="knex_migrations_lock_pkey"),)

    index = Column(Integer)
    is_locked = Column(Integer)


class NotificationAreas(Base):
    __tablename__ = "notification_areas"
    __table_args__ = (
        PrimaryKeyConstraint("id", name="notification_areas_pkey"),
        Index("idx_notification_areas_geog", "geog"),
    )

    id = Column(Integer)
    geog = Column(
        Geography("POLYGON", 4326, from_text="ST_GeogFromText", name="geography"),
        nullable=False,
    )

    user = relationship(
        "Users", secondary="users_have_notification_areas", back_populates="area"
    )


class Organizations(Base):
    __tablename__ = "organizations"
    __table_args__ = (PrimaryKeyConstraint("id", name="organizations_pkey"),)

    id = Column(Integer)
    name = Column(String(128), nullable=False)
    org_type = Column(Enum("agency", "contractor", name="org_types"))

    users = relationship("Users", back_populates="organization")


class Photos(Base):
    __tablename__ = "photos"
    __table_args__ = (
        CheckConstraint(
            "photo_date <= (CURRENT_TIMESTAMP + '00:01:00'::interval)",
            name="photos_photo_date_check",
        ),
        PrimaryKeyConstraint("id", name="photos_pkey"),
        Index("idx_photos_photo_location", "photo_location"),
    )

    id = Column(Integer)
    bucket_path = Column(String(256), nullable=False)
    photo_location = Column(
        Geography("POINT", 4326, from_text="ST_GeogFromText", name="geography")
    )
    photo_date = Column(DateTime(True))

    report_infos = relationship("ReportInfos", back_populates="photo")


t_report_infos_bckup_442023 = Table(
    "report_infos_bckup_442023",
    metadata,
    Column("report_id", Integer),
    Column("user_id", Integer),
    Column(
        "animal_location",
        Geography("POINT", 4326, from_text="ST_GeogFromText", name="geography"),
    ),
    Column("photo_id", Integer),
    Column(
        "submit_location",
        Geography("POINT", 4326, from_text="ST_GeogFromText", name="geography"),
    ),
    Column("submit_date", DateTime(True)),
    Column("species_id", Integer),
    Column("common_name", String(128)),
    Column("scientific_name", String(128)),
    Column("species_type", Enum("domestic", "wild", "unknown", name="species_types")),
    Column(
        "species_class",
        Enum(
            "amphibians",
            "birds",
            "mammals",
            "reptiles",
            "unknown",
            name="species_classes",
        ),
    ),
    Column(
        "species_order",
        Enum(
            "carnivores",
            "hoofed animals",
            "rabbits/hares",
            "rodents",
            "upland birds",
            "vultures",
            "unknown",
            name="species_orders",
        ),
    ),
    Column(
        "family",
        Enum(
            "antelope",
            "bears",
            "beavers",
            "bison",
            "cats",
            "cows",
            "deer",
            "dogs",
            "frogs/toads",
            "goats",
            "grouse",
            "horses",
            "lizards",
            "partridge",
            "pheasant",
            "porcupines",
            "prairie dogs",
            "ptarmingans",
            "quail",
            "rabbits & hares",
            "raccoons",
            "sheep",
            "skunks",
            "snakes",
            "turtle/tortoise",
            "vultures",
            "weasels",
            "unknown",
            name="species_families",
        ),
    ),
    Column(
        "species_confidence_level",
        Enum("high", "medium", "low", name="confidence_levels"),
    ),
    Column("sex", Enum("male", "female", "unknown", name="genders")),
    Column("age_class", Enum("adult", "juvenile", "unknown", name="age_classes")),
    Column("comments", String(512)),
    Index("idx_report_infos_bckup_442023_animal_location", "animal_location"),
    Index("idx_report_infos_bckup_442023_submit_location", "submit_location"),
)


class SpatialRefSys(Base):
    __tablename__ = "spatial_ref_sys"
    __table_args__ = (
        CheckConstraint(
            "(srid > 0) AND (srid <= 998999)", name="spatial_ref_sys_srid_check"
        ),
        PrimaryKeyConstraint("srid", name="spatial_ref_sys_pkey"),
    )

    srid = Column(Integer)
    auth_name = Column(String(256))
    auth_srid = Column(Integer)
    srtext = Column(String(2048))
    proj4text = Column(String(2048))


class Species(Base):
    __tablename__ = "species"
    __table_args__ = (PrimaryKeyConstraint("species_id", name="species_pkey"),)

    species_id = Column(Integer)
    common_name = Column(String(128), nullable=False)
    scientific_name = Column(String(128), nullable=False)
    species_type = Column(
        Enum("domestic", "wild", "unknown", name="species_types"), nullable=False
    )
    species_class = Column(
        Enum(
            "amphibians",
            "birds",
            "mammals",
            "reptiles",
            "unknown",
            name="species_classes",
        ),
        nullable=False,
    )
    family = Column(
        Enum(
            "antelope",
            "bears",
            "beavers",
            "bison",
            "cats",
            "cows",
            "deer",
            "dogs",
            "frogs/toads",
            "goats",
            "grouse",
            "horses",
            "lizards",
            "partridge",
            "pheasant",
            "porcupines",
            "prairie dogs",
            "ptarmingans",
            "quail",
            "rabbits & hares",
            "raccoons",
            "sheep",
            "skunks",
            "snakes",
            "turtle/tortoise",
            "vultures",
            "weasels",
            "unknown",
            name="species_families",
        ),
        nullable=False,
    )
    rare = Column(Boolean, nullable=False, server_default=text("false"))
    frequent = Column(Boolean, nullable=False, server_default=text("false"))
    species_order = Column(
        Enum(
            "carnivores",
            "hoofed animals",
            "rabbits/hares",
            "rodents",
            "upland birds",
            "vultures",
            "unknown",
            name="species_orders",
        )
    )

    report_infos = relationship("ReportInfos", back_populates="species")


class Users(Base):
    __tablename__ = "users"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], name="users_organization_id_fkey"
        ),
        PrimaryKeyConstraint("id", name="users_pkey"),
    )

    id = Column(Integer)
    role = Column(
        Enum("admin", "reporter", "agency", "contractor", name="roles"), nullable=False
    )
    auth_provider = Column(
        Enum("utahid", "google", "facebook", "apple", name="auth_providers"),
        nullable=False,
    )
    auth_id = Column(String(64), nullable=False)
    email = Column(String(256), nullable=False)
    first_name = Column(String(25), nullable=False)
    last_name = Column(String(25), nullable=False)
    registered_date = Column(DateTime(True), nullable=False)
    last_logged_in = Column(DateTime(True), nullable=False)
    phone = Column(String(25), nullable=False)
    organization_id = Column(Integer)
    approved = Column(Boolean)
    approved_date = Column(DateTime(True))

    area = relationship(
        "NotificationAreas",
        secondary="users_have_notification_areas",
        back_populates="user",
    )
    organization = relationship("Organizations", back_populates="users")
    report_infos = relationship("ReportInfos", back_populates="user")
    routes = relationship("Routes", back_populates="user")


class ReportInfos(Base):
    __tablename__ = "report_infos"
    __table_args__ = (
        CheckConstraint(
            "submit_date <= (CURRENT_TIMESTAMP + '00:01:00'::interval)",
            name="report_infos_submit_date_check",
        ),
        ForeignKeyConstraint(
            ["photo_id"], ["photos.id"], name="report_infos_photo_id_fkey"
        ),
        ForeignKeyConstraint(
            ["species_id"], ["species.species_id"], name="report_infos_species_id_fkey"
        ),
        ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name="report_infos_user_id_fkey",
        ),
        PrimaryKeyConstraint("report_id", name="report_infos_pkey"),
        Index("idx_report_infos_animal_location", "animal_location"),
        Index("idx_report_infos_submit_location", "submit_location"),
    )

    report_id = Column(Integer)
    user_id = Column(Integer, nullable=False)
    animal_location = Column(
        Geography("POINT", 4326, from_text="ST_GeogFromText", name="geography"),
        nullable=False,
    )
    submit_location = Column(
        Geography("POINT", 4326, from_text="ST_GeogFromText", name="geography"),
        nullable=False,
    )
    submit_date = Column(DateTime(True), nullable=False)
    common_name = Column(String(128), nullable=False)
    scientific_name = Column(String(128), nullable=False)
    species_type = Column(
        Enum("domestic", "wild", "unknown", name="species_types"), nullable=False
    )
    species_class = Column(
        Enum(
            "amphibians",
            "birds",
            "mammals",
            "reptiles",
            "unknown",
            name="species_classes",
        ),
        nullable=False,
    )
    family = Column(
        Enum(
            "antelope",
            "bears",
            "beavers",
            "bison",
            "cats",
            "cows",
            "deer",
            "dogs",
            "frogs/toads",
            "goats",
            "grouse",
            "horses",
            "lizards",
            "partridge",
            "pheasant",
            "porcupines",
            "prairie dogs",
            "ptarmingans",
            "quail",
            "rabbits & hares",
            "raccoons",
            "sheep",
            "skunks",
            "snakes",
            "turtle/tortoise",
            "vultures",
            "weasels",
            "unknown",
            name="species_families",
        ),
        nullable=False,
    )
    photo_id = Column(Integer)
    species_id = Column(Integer)
    species_order = Column(
        Enum(
            "carnivores",
            "hoofed animals",
            "rabbits/hares",
            "rodents",
            "upland birds",
            "vultures",
            "unknown",
            name="species_orders",
        )
    )
    species_confidence_level = Column(
        Enum("high", "medium", "low", name="confidence_levels")
    )
    sex = Column(Enum("male", "female", "unknown", name="genders"))
    age_class = Column(Enum("adult", "juvenile", "unknown", name="age_classes"))
    comments = Column(String(512))

    photo = relationship("Photos", back_populates="report_infos")
    species = relationship("Species", back_populates="report_infos")
    user = relationship("Users", back_populates="report_infos")


class Routes(Base):
    __tablename__ = "routes"
    __table_args__ = (
        CheckConstraint(
            "end_time <= (CURRENT_TIMESTAMP + '00:01:00'::interval)",
            name="routes_end_time_check",
        ),
        CheckConstraint(
            "start_time <= (CURRENT_TIMESTAMP + '00:01:00'::interval)",
            name="routes_start_time_check",
        ),
        CheckConstraint(
            "submit_date <= (CURRENT_TIMESTAMP + '00:01:00'::interval)",
            name="routes_submit_date_check",
        ),
        ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE", name="routes_user_id_fkey"
        ),
        PrimaryKeyConstraint("route_id", name="routes_pkey"),
        Index("idx_routes_geog", "geog"),
    )

    route_id = Column(Integer)
    user_id = Column(Integer, nullable=False)
    geog = Column(
        Geography("LINESTRING", 4326, from_text="ST_GeogFromText", name="geography"),
        nullable=False,
    )
    start_time = Column(DateTime(True), nullable=False)
    end_time = Column(DateTime(True), nullable=False)
    submit_date = Column(DateTime(True), nullable=False)

    user = relationship("Users", back_populates="routes")


t_users_have_notification_areas = Table(
    "users_have_notification_areas",
    metadata,
    Column("user_id", Integer, nullable=False),
    Column("area_id", Integer, nullable=False),
    ForeignKeyConstraint(
        ["area_id"],
        ["notification_areas.id"],
        ondelete="CASCADE",
        name="users_have_notification_areas_area_id_fkey",
    ),
    ForeignKeyConstraint(
        ["user_id"],
        ["users.id"],
        ondelete="CASCADE",
        name="users_have_notification_areas_user_id_fkey",
    ),
)


# t_pickup_reports = Table(
#     "pickup_reports",
#     metadata,
#     Column("report_id", Integer, nullable=False),
#     Column("pickup_date", DateTime(True), nullable=False),
#     Column("route_id", Integer),
#     CheckConstraint(
#         "pickup_date <= (CURRENT_TIMESTAMP + '00:01:00'::interval)",
#         name="pickup_reports_pickup_date_check",
#     ),
#     ForeignKeyConstraint(
#         ["report_id"],
#         ["report_infos.report_id"],
#         ondelete="CASCADE",
#         name="pickup_reports_report_id_fkey",
#     ),
#     ForeignKeyConstraint(
#         ["route_id"],
#         ["routes.route_id"],
#         ondelete="CASCADE",
#         name="pickup_reports_route_id_fkey",
#     ),
# )


class PickupReports(Base):
    __tablename__ = "pickup_reports"
    __table_args__ = (PrimaryKeyConstraint("report_id"),)
    report_id = Column(Integer, nullable=False)
    pickup_date = Column(DateTime(True), nullable=False)
    route_id = Column(Integer)


t_public_reports = Table(
    "public_reports",
    metadata,
    Column("report_id", Integer, nullable=False),
    Column("repeat_submission", Boolean, nullable=False, server_default=text("false")),
    Column("discovery_date", DateTime(True), nullable=False),
    CheckConstraint(
        "discovery_date <= (CURRENT_TIMESTAMP + '00:01:00'::interval)",
        name="public_reports_discovery_date_check",
    ),
    ForeignKeyConstraint(
        ["report_id"],
        ["report_infos.report_id"],
        ondelete="CASCADE",
        name="public_reports_report_id_fkey",
    ),
)
