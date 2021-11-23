CREATE EXTENSION IF NOT EXISTS postgis;

DROP SCHEMA IF EXISTS tiger CASCADE;
DROP SCHEMA IF EXISTS tiger_data CASCADE;
DROP SCHEMA IF EXISTS topology CASCADE;

SET TIME ZONE 'America/Denver';

-- users
DROP TYPE IF EXISTS roles CASCADE;
CREATE TYPE roles as ENUM('admin', 'reporter', 'agency', 'contractor');
DROP TYPE IF EXISTS auth_providers CASCADE;
CREATE TYPE auth_providers as ENUM('utahid', 'google', 'facebook');
DROP TYPE IF EXISTS org_types CASCADE;
CREATE TYPE org_types as ENUM('agency', 'contractor');

DROP TABLE IF EXISTS notification_areas CASCADE;
CREATE TABLE notification_areas
(
  id serial PRIMARY KEY,
  geog geography(POLYGON, 4326) NOT NULL
);

DROP TABLE IF EXISTS organizations CASCADE;
CREATE TABLE organizations
(
  id serial PRIMARY KEY,
  name varchar(128) NOT NULL,
  org_type org_types
);

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users
(
  id serial PRIMARY KEY,
  organization_id integer REFERENCES organizations (id),
  role roles NOT NULL,
  approved boolean,
  auth_provider auth_providers NOT NULL,
  auth_id varchar(64) NOT NULL,
  email varchar(256) NOT NULL,
  first_name varchar(25) NOT NULL,
  last_name varchar(25) NOT NULL,
  registered_date timestamptz NOT NULL,
  last_logged_in timestamptz NOT NULL,
  phone varchar(25) NOT NULL,
  approved_date timestamptz
);

DROP TABLE IF EXISTS users_have_notification_areas CASCADE;
CREATE TABLE users_have_notification_areas
(
  user_id integer NOT NULL REFERENCES users (id),
  area_id integer NOT NULL REFERENCES notification_areas (id)
);


-- species
DROP TABLE IF EXISTS species CASCADE;

DROP TYPE IF EXISTS species_types CASCADE;
CREATE TYPE species_types as ENUM('domestic', 'wild');
DROP TYPE IF EXISTS species_classes CASCADE;
CREATE TYPE species_classes as ENUM('amphibians', 'birds', 'mammals', 'reptiles');
DROP TYPE IF EXISTS species_orders CASCADE;
CREATE TYPE species_orders as ENUM('carnivores', 'hoofed animals', 'rabbits/hares', 'rodents', 'upland birds', 'vultures');
DROP TYPE IF EXISTS species_families CASCADE;
CREATE TYPE species_families as ENUM('antelope', 'bears', 'beavers', 'bison', 'cats', 'cows', 'deer', 'dogs', 'frogs/toads', 'goats', 'grouse', 'horses', 'lizards', 'partridge', 'pheasant', 'porcupines', 'prairie dogs', 'ptarmingans', 'quail', 'rabbits & hares', 'raccoons', 'sheep', 'skunks', 'snakes', 'turtle/tortoise', 'vultures', 'weasels');

CREATE TABLE species
(
  id serial PRIMARY KEY,
  common_name varchar(128) NOT NULL,
  scientific_name varchar(128) NOT NULL,
  species_type species_types NOT NULL,
  species_class species_classes NOT NULL,
  species_order species_orders,
  family species_families NOT NULL,
  rare boolean NOT NULL DEFAULT false,
  frequent boolean NOT NULL DEFAULT false,
  image_url varchar(256)
);


-- reports
DROP TABLE IF EXISTS photos CASCADE;
CREATE TABLE photos
(
  id serial PRIMARY KEY,
  bucket_path varchar(256) NOT NULL,
  photo_location geography(POINT, 4326),
  photo_date timestamptz CHECK (photo_date <= CURRENT_TIMESTAMP + interval '1 minute')
);

DROP TYPE IF EXISTS confidence_levels CASCADE;
CREATE TYPE confidence_levels AS ENUM ('high', 'medium', 'low');
DROP TYPE IF EXISTS genders CASCADE;
CREATE TYPE genders AS ENUM ('male', 'female', 'unknown');
DROP TYPE IF EXISTS age_classes CASCADE;
CREATE TYPE age_classes AS ENUM ('adult', 'juvenile', 'unknown');

DROP TABLE IF EXISTS report_infos CASCADE;
CREATE TABLE report_infos
(
  report_id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id),
  animal_location geography(POINT, 4326) NOT NULL,
  photo_id integer REFERENCES photos (id),
  submit_location geography(POINT, 4326) NOT NULL,
  submit_date timestamptz NOT NULL CHECK (submit_date <= CURRENT_TIMESTAMP + interval '1 minute'),
  species_id integer NOT NULL REFERENCES species (id),
  common_name varchar(128) NOT NULL,
  scientific_name varchar(128) NOT NULL,
  species_type species_types NOT NULL,
  species_class species_classes NOT NULL,
  species_order species_orders,
  family species_families NOT NULL,
  species_confidence_level confidence_levels,
  sex genders,
  age_class age_classes,
  comments varchar(512)
);

DROP TABLE IF EXISTS public_reports CASCADE;
CREATE TABLE public_reports
(
  report_id integer NOT NULL REFERENCES report_infos (report_id),
  repeat_submission bool NOT NULL DEFAULT false,
  discovery_date timestamptz NOT NULL CHECK (discovery_date <= CURRENT_TIMESTAMP + interval '1 minute')
);

DROP TABLE IF EXISTS pickup_reports CASCADE;
CREATE TABLE pickup_reports
(
  report_id integer NOT NULL REFERENCES report_infos (report_id),
  pickup_date timestamptz NOT NULL CHECK (pickup_date <= CURRENT_TIMESTAMP + interval '1 minute'),
  route_id integer NOT NULL
);

-- routes
DROP TABLE IF EXISTS routes CASCADE;
CREATE TABLE routes
(
  route_id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id),
  geog geography(LINESTRING, 4326) NOT NULL,
  start_time timestamptz NOT NULL CHECK (start_time <= CURRENT_TIMESTAMP + interval '1 minute'),
  end_time timestamptz NOT NULL CHECK (end_time <= CURRENT_TIMESTAMP + interval '1 minute'),
  submit_date timestamptz NOT NULL CHECK (submit_date <= CURRENT_TIMESTAMP + interval '1 minute')
);


-- roles
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "admin";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "admin";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "admin";

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON ALL TABLES IN SCHEMA public TO "api";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "api";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "api";

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON ALL TABLES IN SCHEMA public TO "editor";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "editor";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "editor";

GRANT SELECT  ON ALL TABLES IN SCHEMA public TO "viewer";
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO "viewer";
