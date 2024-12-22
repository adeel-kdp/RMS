const Joi = require('joi');

const createContactUs = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    message: Joi.string().required(),
    file: Joi.any(),
  }),
};

module.exports = {
  createContactUs,
};
