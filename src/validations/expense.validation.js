const Joi = require('joi');

const createExpense = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    amount: Joi.number().required(),
    date: Joi.date().required(),
  }),
};

const getExpense = {
  params: Joi.object().keys({
    expenseId: Joi.string().required(),
  }),
};

const updateExpense = {
  params: Joi.object().keys({
    expenseId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string(),
    amount: Joi.number(),
    date: Joi.date(),
  }).min(1),
};

const deleteExpense = {
  params: Joi.object().keys({
    expenseId: Joi.string().required(),
  }),
};

module.exports = {
  createExpense,
  getExpense,
  updateExpense,
  deleteExpense,
};