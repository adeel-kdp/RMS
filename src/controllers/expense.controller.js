const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { expenseService } = require('../services');
const pick = require('../utils/pick');

const createExpense = catchAsync(async (req, res) => {
  const expense = await expenseService.createExpense(req.body);
  res.status(httpStatus.CREATED).send(expense);
});

const getExpensesWithPagination = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'isActive']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  // Convert string values to appropriate types
  if (options.limit) options.limit = parseInt(options.limit);
  if (options.page) options.page = parseInt(options.page);
  
  const result = await expenseService.queryExpenses(filter, options);
  res.send(result);
});


const getExpense = catchAsync(async (req, res) => {
  const expense = await expenseService.getExpenseById(req.params.expenseId);
  if (!expense) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Expense not found');
  }
  res.send(expense);
});

const updateExpense = catchAsync(async (req, res) => {
  const expense = await expenseService.updateExpenseById(req.params.expenseId, req.body);
  res.send(expense);
});

const deleteExpense = catchAsync(async (req, res) => {
  await expenseService.deleteExpenseById(req.params.expenseId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getExpenseAnalytics = catchAsync(async (req, res) => {
  const result = await expenseService.getExpenseAnalytics();
  res.send(result);
});
module.exports = {
  createExpense,
  getExpensesWithPagination,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpenseAnalytics,
};