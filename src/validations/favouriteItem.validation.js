const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createFavouriteItem = {
  body: Joi.object().keys({
    productId: Joi.string().required(),
  }),
};

const getFavouriteItem = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

const deleteFavouriteItem = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createFavouriteItem,
  getFavouriteItem,
  deleteFavouriteItem,
};