const Joi = require("joi");
const { objectId } = require("./custom.validation");

const createOrder = {
  body: Joi.object().keys({
    // customerId: Joi.string().custom(objectId).required(),
    totalAmount: Joi.number().required(),
    // paymentStatus: Joi.string().valid('unpaid', 'paid').default('unpaid').required(),
    // paymentMethod: Joi.string().required(),
    totalItems: Joi.number().required(),
    orderStatus: Joi.string().valid('completed', 'cancelled', 'pending').default('pending').required(),
    orderDate: Joi.date().required(),
    items: Joi.array().items(
      Joi.object().keys({
        productId: Joi.string().custom(objectId).required(),
        purchaseQuantity: Joi.number().required(),
        price: Joi.number().required(),
        name: Joi.string().required(),
        imageUrl: Joi.string().allow('', null),
        dealProducts: Joi.any(),
        isStockAble: Joi.boolean().required(),
        isParentProduct: Joi.boolean().required(),
        shopId: Joi.string().custom(objectId).required(),
      })
    ).required(),
    shippingAddress: Joi.string().required(),
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
    customerId: Joi.string().custom(objectId),
    totalAmount: Joi.number(),
    paymentStatus: Joi.string().valid('unpaid', 'paid'),
    paymentMethod: Joi.string(),
    totalItems: Joi.number(),
    orderStatus: Joi.string().valid('completed', 'cancelled'),
    orderDate: Joi.date(),
    items: Joi.array().items(
      Joi.object().keys({
        product: Joi.string().custom(objectId),
        orderQuantity: Joi.number(),
        price: Joi.number(),
      })
    ),
    shippingAddress: Joi.string(),
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
