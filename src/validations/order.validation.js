const Joi = require("joi");
const { objectId } = require("./custom.validation");

const createOrder = {
  body: Joi.object().keys({
    orderId: Joi.string().required(),
    customerName: Joi.string().optional(),
    customerContactNo: Joi.string().optional(),
    totalAmount: Joi.number().required(),
    paymentStatus: Joi.string().valid('unpaid', 'paid').default('paid'),
    items: Joi.array().items(
      Joi.object().keys({
        productId: Joi.string().custom(objectId).required(),
        quantity: Joi.number().required(),
        price: Joi.number().required(),
        name: Joi.string().required(),
        isStockAble: Joi.boolean().optional(),
        parentProduct: Joi.string().custom(objectId).optional(),
        plateType: Joi.string().valid('full', 'half').optional(),
        unit: Joi.string().optional().trim(),
        dealProducts: Joi.array().items(
          Joi.object().keys({
            productId: Joi.string().custom(objectId).optional(),
            quantity: Joi.number().integer().min(0).optional(),
            _id: Joi.string().custom(objectId).optional(),
          })
        ).optional(),
      })
    ).required(),
    shippingAddress: Joi.string(),
    shopId: Joi.string().custom(objectId).required(),
  }),
};

const getOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().custom(objectId).required(),
  }),
};

const updateOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    customerName: Joi.string().optional(),
    customerContactNo: Joi.string().optional(),
    totalAmount: Joi.number(),
    paymentStatus: Joi.string().valid('unpaid', 'paid').default('paid').optional(),
    items: Joi.array().items(
      Joi.object().keys({
        productId: Joi.string().custom(objectId).required(),
        quantity: Joi.number().required(),
        price: Joi.number().required(),
        name: Joi.string().required(),
        isStockAble: Joi.boolean().optional(),
        parentProduct: Joi.string().custom(objectId).optional(),
        plateType: Joi.string().valid('full', 'half').optional(),
        unit: Joi.string().optional().trim(),
        dealProducts: Joi.array().items(
          Joi.object().keys({
            productId: Joi.string().custom(objectId).optional(),
            quantity: Joi.number().integer().min(0).optional(),
            _id: Joi.string().custom(objectId).optional(),
          })
        ).optional(),
      })
    ),
    shippingAddress: Joi.string(),
    shopId: Joi.string().custom(objectId),
    userId: Joi.string().custom(objectId),
  })
    .min(1),
};

const deleteOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createOrder,
  getOrder,
  updateOrder,
  deleteOrder,
};