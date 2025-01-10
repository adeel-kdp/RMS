const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createProduct = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    categoryId: Joi.string().custom(objectId).required(),
    shopId: Joi.string().custom(objectId).required(),
    price: Joi.number().min(0).required(),
    tax: Joi.number().min(0).default(0),
    unit: Joi.string().required().trim(),
    plateType: Joi.string().valid('full', 'half').optional(),
    stock: Joi.number().integer().min(0),
    description: Joi.string().allow('', null),
    parentProduct: Joi.string().custom(objectId).optional(),
    images: Joi.array()
      .items(
        Joi.object().keys({
          image: Joi.string().required(),
        })
      )
      .required(),
    dealProducts: Joi.array()
      .items(
        Joi.object().keys({
          productId: Joi.string().custom(objectId).required(),
          quantity: Joi.number().integer().min(0).required(),
        })
      )
      .default([]),
    isStockAble: Joi.boolean().default(true),
    isShowcase: Joi.boolean().default(true),
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
  body: Joi.object()
    .keys({
      name: Joi.string().required(),
      categoryId: Joi.string().custom(objectId).required(),
      shopId: Joi.string().custom(objectId).required(),
      price: Joi.number().min(0).required(),
      tax: Joi.number().min(0).default(0),
      unit: Joi.string().required().trim(),
      plateType: Joi.string().valid('full', 'half').optional(),
      stock: Joi.number().integer().min(0).required(),
      description: Joi.string().allow('', null),
      parentProduct: Joi.string().custom(objectId).optional(),
      images: Joi.array()
        .items(
          Joi.object().keys({
            image: Joi.string().required(),
          })
        )
        .required(),
      dealProducts: Joi.array()
        .items(
          Joi.object().keys({
            productId: Joi.string().custom(objectId).required(),
            quantity: Joi.number().integer().min(0).required(),
          })
        )
        .default([]),
      isStockAble: Joi.boolean().default(true),
      isShowcase: Joi.boolean().default(true),
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
