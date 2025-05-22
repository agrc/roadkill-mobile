const { boolean, date, number, object, string } = require('yup');

const location = string();
const photo = object().shape({
  uri: string().required(),
  type: string().required(),
  name: string().required(),
});
const photo_location = location.nullable();
const photo_date = date().nullable();
const animal_location = location.required();
const submit_location = location.required();
const submit_date = date().required();
const species_id = number().nullable();
const common_name = string().required();
const scientific_name = string().required();
const species_type = string().required();
const species_class = string().required();
const species_order = string().nullable();
const family = string().required();
const species_confidence_level = string().nullable();
const age_class = string().nullable();
const sex = string().nullable();
const comments = string().nullable();

exports.report = object().shape({
  animal_location,
  photo: photo.nullable(),
  photo_location,
  photo_date,
  repeat_submission: boolean().required(),
  submit_location,
  submit_date,
  species_id,
  common_name,
  scientific_name,
  species_type,
  species_class,
  species_order,
  family,
  species_confidence_level,
  age_class,
  sex,
  comments,
  discovery_date: date().required(),
});

exports.pickup = object().shape({
  animal_location,
  photo: photo.nullable(),
  photo_location,
  photo_date,
  submit_location,
  submit_date,
  species_id,
  common_name,
  scientific_name,
  species_type,
  species_class,
  species_order,
  family,
  species_confidence_level,
  age_class,
  sex,
  comments,
  pickup_date: date().required(),
});
