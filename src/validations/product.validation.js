const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createProduct = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    category: Joi.string().custom(objectId).required(),
    subCategory: Joi.string().required(),
    quantity: Joi.number().integer().min(0).required(),
    price: Joi.number().min(0).required(),
    description: Joi.string(),
    manufacturingCost: Joi.number().min(0).required(),
    keywords: Joi.object().keys({
      newArrival: Joi.boolean().default(false),
      bestSeller: Joi.boolean().default(false),
      discounted: Joi.boolean().default(false),
      custom: Joi.array().items(Joi.string()),
    }),
    images: Joi.array().items(
      Joi.object().keys({
        image: Joi.string().required(),
      })
    ).required(),
    productType: Joi.string().required().valid('Digital Products', '3d Characters', '2D Characters'),
    isActive: Joi.boolean().default(true),
  }),
};

const getProduct = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId).required(),
  }),
};

const updateProduct = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().required(),
    category: Joi.string().custom(objectId).required(),
    subCategory: Joi.string().required(),
    quantity: Joi.number().integer().min(0).required(),
    price: Joi.number().min(0).required(),
    description: Joi.string(),
    manufacturingCost: Joi.number().min(0).required(),
    keywords: Joi.object().keys({
      newArrival: Joi.boolean().default(false),
      bestSeller: Joi.boolean().default(false),
      discounted: Joi.boolean().default(false),
      custom: Joi.array().items(Joi.string()),
    }),
    images: Joi.array().items(
      Joi.object().keys({
        image: Joi.string().required(),
      })
    ).required(),
    productType: Joi.string().required().valid('Digital Products', '3d Characters', '2D Characters'),
    isActive: Joi.boolean().default(true),
  })
    .min(1),
};

const deleteProduct = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
};