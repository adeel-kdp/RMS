const Joi = require('joi');

const createShop = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    address: Joi.string().required(),
  }),
};

const getShop = {
  params: Joi.object().keys({
    shopId: Joi.string().required(),
  }),
};

const updateShop = {
  params: Joi.object().keys({
    shopId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string(),
    address: Joi.string(),
  }),
};

const deleteShop = {
  params: Joi.object().keys({
    shopId: Joi.string().required(),
  }),
};

module.exports = {
  createShop,
  getShop,
  updateShop,
  deleteShop,
};

