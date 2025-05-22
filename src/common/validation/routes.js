const { date, object, string } = require('yup');

exports.route = object().shape({
  geog: string().required(),
  start_time: date().required(),
  end_time: date().required(),
  submit_date: date().required(),
});
