const yup = require('yup');

const location = yup.string();
const photo = yup.object().shape({
  uri: yup.string().required(),
  type: yup.string().required(),
  name: yup.string().required(),
});
const photo_location = location.nullable();
const photo_date = yup.date().nullable();
const animal_location = location.required();
const submit_location = location.required();
const submit_date = yup.date().required();
const species_id = yup.number().nullable();
const common_name = yup.string().required();
const scientific_name = yup.string().required();
const species_type = yup.string().required();
const species_class = yup.string().required();
const species_order = yup.string().nullable();
const family = yup.string().required();
const species_confidence_level = yup.string().nullable();
const age_class = yup.string().nullable();
const sex = yup.string().nullable();
const comments = yup.string().nullable();

exports.report = yup.object().shape({
  animal_location,
  photo: photo.nullable(),
  photo_location,
  photo_date,
  repeat_submission: yup.boolean().required(),
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
  discovery_date: yup.date().required(),
});

exports.pickup = yup.object().shape({
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
  pickup_date: yup.date().required(),
});
