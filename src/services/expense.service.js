const { Expense } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const createExpense = async (expenseBody) => {
  return Expense.create(expenseBody);
};

const queryExpenses = async (filter, options) => {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;

  // Remove empty name filter
  if (filter.name === '') {
    delete filter.name;
  }

  // Prepare sort options
  let sortOptions = {};
  if (options.sortBy) {
    // Handle simple sortBy format (e.g., "name")
    if (!options.sortBy.includes(':')) {
      sortOptions[options.sortBy] = 1; // Default to ascending
    } else {
      // Handle detailed sortBy format (e.g., "name:desc")
      const [key, order] = options.sortBy.split(':');
      sortOptions[key] = order === 'desc' ? -1 : 1;
    }
  }

  // If filter.name exists, create case-insensitive regex
  if (filter.name) {
    filter.name = new RegExp(filter.name, 'i');
  }
  // filter.isActive = true;
  // Execute query with pagination
  const [expenses, totalExpenses] = await Promise.all([
    Expense.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(), // Add lean() for better performance
    Expense.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalExpenses / limit);

  return {
    results: expenses,
    page,
    limit,
    totalPages,
    totalResults: totalExpenses,
  };
};

const getExpenseById = async (id) => {
  return Expense.findById(id);
};

const updateExpenseById = async (expenseId, updateBody) => {
  const expense = await getExpenseById(expenseId);
  if (!expense) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Expense not found');
  }
  Object.assign(expense, updateBody);
  await expense.save();
  return expense;
};

const deleteExpenseById = async (expenseId) => {
  const expense = await getExpenseById(expenseId);
  if (!expense) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Expense not found');
  }
  await expense.remove();
  return expense;
};

const moment = require('moment');

const getExpenseAnalytics = async () => {
  const today = moment().startOf('day');
  const yesterday = moment().subtract(1, 'days').startOf('day');
  const last7Days = moment().subtract(7, 'days').startOf('day');
  const startOfMonth = moment().startOf('month');

  const todayExpenses = await Expense.aggregate([
    { $match: { date: { $gte: today.toDate() } } },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);

  const yesterdayExpenses = await Expense.aggregate([
    { $match: { date: { $gte: yesterday.toDate(), $lt: today.toDate() } } },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);

  const last7DaysExpenses = await Expense.aggregate([
    { $match: { date: { $gte: last7Days.toDate() } } },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);

  const thisMonthExpenses = await Expense.aggregate([
    { $match: { date: { $gte: startOfMonth.toDate() } } },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);

  const totalExpenses = await Expense.aggregate([
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);

  return {
    today: todayExpenses[0]?.totalAmount || 0,
    yesterday: yesterdayExpenses[0]?.totalAmount || 0,
    last7Days: last7DaysExpenses[0]?.totalAmount || 0,
    thisMonth: thisMonthExpenses[0]?.totalAmount || 0,
    total: totalExpenses[0]?.totalAmount || 0,
  };
};

module.exports = {
  createExpense,
  queryExpenses,
  getExpenseById,
  updateExpenseById,
  deleteExpenseById,
  getExpenseAnalytics
};