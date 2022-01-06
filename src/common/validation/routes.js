import * as yup from 'yup';

export const route = yup.object().shape({
  geog: yup.string().required(),
  start_time: yup.date().required(),
  end_time: yup.date().required(),
  submit_date: yup.date().required(),
});
