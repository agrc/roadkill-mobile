import * as yup from 'yup';

const location = yup.string();
const photo = yup.object().shape({
  uri: yup.string().required(),
  type: yup.string().required(),
  name: yup.string().required(),
});
const photo_location = location.nullable();
const animal_location = location.required();
const user_id = yup.number().required();
const submit_location = location.required();
const submit_date = yup.date().required();
const species = yup.string().nullable();
const species_confidence_level = yup.string().nullable();
const age_class = yup.string().required();
const sex = yup.string().required();
const comments = yup.string().nullable();

export const report = yup.object().shape({
  user_id,
  animal_location,
  photo: photo.nullable(),
  photo_location,
  photo_date: yup.date().nullable(),
  repeat_submission: yup.boolean().required(),
  submit_location,
  submit_date,
  species,
  species_confidence_level,
  age_class,
  sex,
  comments,
});

export const pickup = yup.object().shape({
  user_id,
  animal_location,
  photo: photo.required().typeError('A photo is required.'),
  photo_location,
  photo_date: yup.date().required(),
  submit_location,
  submit_date,
  species,
  species_confidence_level,
  age_class,
  sex,
  comments,
});
