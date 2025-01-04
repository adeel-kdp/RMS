const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createRegularStock = {
  body: Joi.object().keys({
    shopId: Joi.string().custom(objectId).required(),
    items: Joi.array().items(
      Joi.object().keys({
        productId: Joi.string().custom(objectId).required(),
        quantity: Joi.number().required(),
        consumedQuantity: Joi.number().optional(),
        halfPlateConsumedQuantity: Joi.number().optional(),
        fullPlateConsumedQuantity: Joi.number().optional(),
        isAvailable: Joi.boolean().default(true),
      })
    ),
    isDefault: Joi.boolean().default(false),
  }),
};

const getRegularStock = {
  params: Joi.object().keys({
    regularStockId: Joi.string().custom(objectId),
  }),
};

const updateRegularStock = {
  params: Joi.object().keys({
    regularStockId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      shopId: Joi.string().custom(objectId),
      items: Joi.array().items(
        Joi.object().keys({
          productId: Joi.string().custom(objectId).required(),
        quantity: Joi.number().required(),
        consumedQuantity: Joi.number().optional(),
        halfPlateConsumedQuantity: Joi.number().optional(),
        fullPlateConsumedQuantity: Joi.number().optional(),
        isAvailable: Joi.boolean().default(true),
        })
      ),
      isDefault: Joi.boolean(),
    })
    .min(1),
};

const deleteRegularStock = {
  params: Joi.object().keys({
    regularStockId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createRegularStock,
  getRegularStock,
  updateRegularStock,
  deleteRegularStock,
};