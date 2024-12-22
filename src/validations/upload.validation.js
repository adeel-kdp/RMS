const Joi = require("joi");

const uploadFile = {
  body: Joi.object().keys({
    image: Joi.string().required()
  }),
};

const deleteFile = {
  params: Joi.object().keys({
    fileId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    folder: Joi.string().required()
  }),

};

module.exports = {
  deleteFile,
  uploadFile,
};
