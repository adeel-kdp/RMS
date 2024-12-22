const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createCard = {
  body: Joi.object().keys({
    cardholderName: Joi.string().required(),
    cardNumber: Joi.string().required().pattern(/^\d{16}$/),
    expiryMonth: Joi.number().required().min(1).max(12),
    expiryYear: Joi.number().required().min(new Date().getFullYear()),
    cvv: Joi.string().required().pattern(/^\d{3,4}$/),
    cardType: Joi.string().required().valid('Visa', 'Mastercard', 'PayPal', 'Bitcoin', 'Amazon', 'Klarna', 'Pioneer', 'Ethereum'),
    isDefault: Joi.boolean()
  }),
};

const getCard = {
  params: Joi.object().keys({
    cardId: Joi.string().custom(objectId),
  }),
};

const updateCard = {
  params: Joi.object().keys({
    cardId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      cardholderName: Joi.string(),
      expiryMonth: Joi.number().min(1).max(12),
      expiryYear: Joi.number().min(new Date().getFullYear()),
      isDefault: Joi.boolean(),
    })
    .min(1),
};

const deleteCard = {
  params: Joi.object().keys({
    cardId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createCard,
  getCard,
  updateCard,
  deleteCard,
};