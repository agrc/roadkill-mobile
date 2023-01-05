-- agol_pickup_reports
drop view if exists agol_pickup_reports;

create view agol_pickup_reports as
select
  ri.report_id,
  ri.user_id,
  o.name as organization_name,
  u.first_name,
  u.last_name,
  u.email,
  ri.animal_location,
  ri.submit_date,
  ri.species_id,
  ri.common_name,
  ri.scientific_name,
  ri.species_type :: varchar(50),
  ri.species_class :: varchar(50),
  ri.species_order :: varchar(50),
  ri.family :: varchar(50),
  ri.species_confidence_level :: varchar(50),
  ri.sex :: varchar(50),
  ri.age_class :: varchar(50),
  ri.comments,
  pr.pickup_date,
  pr.route_id,
  p.bucket_path as photo
from
  report_infos ri
  join pickup_reports pr on ri.report_id = pr.report_id
  join users u on u.id = ri.user_id
  left outer join organizations o on o.id = u.organization_id
  left outer join photos p on p.id = ri.photo_id;

-- agol_public_reports
drop view if exists agol_public_reports;

create view agol_public_reports as
select
  ri.report_id,
  ri.user_id,
  o.name as organization_name,
  u.first_name,
  u.last_name,
  u.email,
  ri.animal_location,
  ri.submit_date,
  ri.species_id,
  ri.common_name,
  ri.scientific_name,
  ri.species_type :: varchar(50),
  ri.species_class :: varchar(50),
  ri.species_order :: varchar(50),
  ri.family :: varchar(50),
  ri.species_confidence_level :: varchar(50),
  ri.sex :: varchar(50),
  ri.age_class :: varchar(50),
  ri.comments,
  pr.repeat_submission,
  pr.discovery_date,
  p.bucket_path as photo
from
  report_infos ri
  join public_reports pr on ri.report_id = pr.report_id
  join users u on u.id = ri.user_id
  left outer join organizations o on o.id = u.organization_id
  left outer join photos p on p.id = ri.photo_id;

-- agol_routes
drop view if exists agol_routes;

create view agol_routes as
select
  r.route_id,
  r.user_id,
  o.name as organization_name,
  u.first_name,
  u.last_name,
  u.email,
  r.start_time,
  r.end_time,
  r.submit_date,
  ST_RemoveRepeatedPoints(ST_SnapToGrid(r.geog :: geometry, 0.0001)) :: geography as geog
from
  routes r
  join users u on u.id = r.user_id
  left outer join organizations o on o.id = u.organization_id
where
  ST_NumPoints(
    ST_RemoveRepeatedPoints(ST_SnapToGrid(r.geog :: geometry, 0.0001))
  ) > 1;

-- permissions
grant
select
  on all tables in schema public to viewer;
