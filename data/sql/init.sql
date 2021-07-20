DROP SCHEMA IF EXISTS tiger CASCADE;
DROP SCHEMA IF EXISTS tiger_data CASCADE;
DROP SCHEMA IF EXISTS topology CASCADE;


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
  org_type org_types NOT NULL
);

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users
(
  id serial PRIMARY KEY,
  organization_id integer REFERENCES organizations (id),
  role roles NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  auth_provider auth_providers NOT NULL,
  auth_id varchar(64) NOT NULL,
  email varchar(256) NOT NULL,
  first_name varchar(25) NOT NULL,
  last_name varchar(25) NOT NULL,
  registered_date timestamp NOT NULL CHECK (registered_date <= CURRENT_TIMESTAMP),
  last_logged_in timestamp NOT NULL CHECK (last_logged_in <= CURRENT_TIMESTAMP),
  phone varchar(25) NOT NULL
);

DROP TABLE IF EXISTS users_have_notification_areas CASCADE;
CREATE TABLE users_have_notification_areas
(
  user_id integer NOT NULL REFERENCES users (id),
  area_id integer NOT NULL REFERENCES notification_areas (id)
);


-- reports
DROP TYPE IF EXISTS confidence_levels CASCADE;
CREATE TYPE confidence_levels AS ENUM ('high', 'medium', 'low');
DROP TYPE IF EXISTS genders CASCADE;
CREATE TYPE genders AS ENUM ('male', 'female');
DROP TYPE IF EXISTS age_classes CASCADE;
CREATE TYPE age_classes AS ENUM ('adult', 'juvenile');

DROP TABLE IF EXISTS report_infos CASCADE;
CREATE TABLE report_infos
(
  report_id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id),
  animal_location geography(POINT, 4326) NOT NULL,
  photo_location geography(POINT, 4326),
  photo varchar(256),
  photo_date timestamp CHECK (photo_date <= CURRENT_TIMESTAMP),
  submit_location geography(POINT, 4326) NOT NULL,
  submit_date timestamp NOT NULL CHECK (submit_date <= CURRENT_TIMESTAMP),
  species varchar(25),
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
  discovery_date timestamp NOT NULL CHECK (discovery_date <= CURRENT_TIMESTAMP)
);

DROP TABLE IF EXISTS pickup_reports CASCADE;
CREATE TABLE pickup_reports
(
  report_id integer NOT NULL REFERENCES report_infos (report_id),
  pickup_date timestamp NOT NULL CHECK (pickup_date <= CURRENT_TIMESTAMP),
  est_time_of_death timestamp CHECK (est_time_of_death <= CURRENT_TIMESTAMP),
  route_id integer NOT NULL
);


-- routes
DROP TABLE IF EXISTS routes CASCADE;
CREATE TABLE routes
(
  route_id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id),
  geog geography(LINESTRING, 4326) NOT NULL,
  start_time timestamp NOT NULL CHECK (start_time <= CURRENT_TIMESTAMP),
  end_time timestamp NOT NULL CHECK (end_time <= CURRENT_TIMESTAMP),
  submit_date timestamp NOT NULL CHECK (submit_date <= CURRENT_TIMESTAMP)
);


-- roles
DROP USER IF EXISTS editor;
CREATE USER editor WITH PASSWORD 'editor';
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "editor";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "editor";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "editor";
