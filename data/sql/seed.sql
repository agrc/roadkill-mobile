INSERT INTO public.notification_areas (geog) VALUES
  ('SRID=4326;POLYGON ((-113.5445979786333 41.38303727457798, -114.19835336083736 40.15421928765741, -113.42353216711405 39.3793980939341, -112.54580503359935 40.269231808600715, -112.54580503359935 40.269231808600715, -113.5445979786333 41.38303727457798))'::geography),
  ('SRID=4326;POLYGON ((-111.17170807285567 40.03920676671411, -111.51069234510962 39.016200659376295, -110.20923487127749 38.12636694470967, -109.33150773776279 40.00894031383429, -111.17170807285567 40.03920676671411))'::geography);

INSERT INTO public.organizations ("name",org_type) VALUES
  ('UGRC','agency'::org_types::org_types),
  ('UDWR','agency'::org_types::org_types),
  ('EcoLife','contractor'::org_types::org_types);

INSERT INTO public.users (organization_id,"role",approved,auth_provider,auth_id,email,first_name,last_name,registered_date,last_logged_in,phone) VALUES
  (1,'admin'::roles::roles,true,'utahid'::auth_providers::auth_providers,'123456789','scott@utah.gov','Scott','Davis','2021-07-20 00:00:00','2021-07-20 00:00:00','801-699-7187'),
  (NULL,'reporter'::roles::roles,true,'google'::auth_providers::auth_providers,'234567891','dscottus@gmail.com','Dave','Scottus','2021-07-20 00:00:00','2021-07-20 00:00:00','801-123-4567'),
  (3,'contractor'::roles::roles,true,'utahid'::auth_providers::auth_providers,'345678912','ablackham@ecolife.com','Abcde','Blackham','2021-07-20 00:00:00','2021-07-20 00:00:00','801-123-4567'),
  (2,'agency'::roles::roles,true,'utahid'::auth_providers::auth_providers,'345678912','cthompson@utah.gov','Caleb','Thompson','2021-07-20 00:00:00','2021-07-20 00:00:00','801-123-4567');

INSERT INTO public.routes (user_id,geog,start_time,end_time,submit_date) VALUES
  (3,'SRID=4326;LINESTRING (-112.5700181959032 41.13485236096348, -113.15718738177165 40.08763309132181, -112.68503071684651 38.58641702848289, -111.8436233267876 39.2462257012629)'::geography,'2021-07-08 02:00:00','2021-07-08 02:20:52.449','2021-07-08 12:29:08.02');

INSERT INTO public.users_have_notification_areas (user_id,area_id) VALUES
  (1,2),
  (3,1);

INSERT INTO public.report_infos (user_id,animal_location,photo_location,photo,photo_date,submit_location,submit_date,species,species_confidence_level,sex,age_class,"comments") VALUES
  (1,'SRID=4326;POINT (-112.79974093314752 40.11589497651387)'::geography,'SRID=4326;POINT (-112.78974093314751 40.12589497651387)'::geography,'https://somebucket/image.jpg','2021-07-20 00:00:00','SRID=4326;POINT (-112.79874093314751 40.11489497651387)'::geography,'2021-07-20 00:00:00',NULL,'high'::confidence_levels::confidence_levels,'male'::genders::genders,'adult'::age_classes::age_classes,'some comments'),
  (2,'SRID=4326;POINT (-111.79974093314752 39.11589497651387)'::geography,'SRID=4326;POINT (-111.78974093314751 39.12589497651387)'::geography,'https://somebucket/image2.jpg','2021-07-18 00:00:00','SRID=4326;POINT (-111.79874093314751 39.11489497651387)'::geography,'2021-07-18 00:00:00',NULL,'high'::confidence_levels::confidence_levels,'male'::genders::genders,'adult'::age_classes::age_classes,'some comments');

INSERT INTO public.pickup_reports (report_id,pickup_date,route_id) VALUES
  (1,'2021-07-20 00:00:00',1);

INSERT INTO public.public_reports (report_id, repeat_submission, discovery_date) VALUES
  (2, true, '2021-07-18 00:00:00');
