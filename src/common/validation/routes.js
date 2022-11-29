const yup = require('yup');

exports.route = yup.object().shape({
  geog: yup.string().required(),
  start_time: yup.date().required(),
  end_time: yup.date().required(),
  submit_date: yup.date().required(),
});
