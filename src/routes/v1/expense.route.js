const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const expenseValidation = require('../../validations/expense.validation');
const expenseController = require('../../controllers/expense.controller');

const router = express.Router();

// Define specific routes first
router.get('/analytics', auth.verifyToken(), expenseController.getExpenseAnalytics);
router.get('/byDate', auth.verifyToken(), expenseController.getExpensesByDate);

// Define general routes after specific ones
router
  .route('/')
  .post(auth.verifyToken(), validate(expenseValidation.createExpense), expenseController.createExpense)
  .get(auth.verifyToken(), expenseController.getExpensesWithPagination);

router
  .route('/:expenseId')
  .get(auth.verifyToken(), validate(expenseValidation.getExpense), expenseController.getExpense)
  .put(auth.verifyToken(), validate(expenseValidation.updateExpense), expenseController.updateExpense)
  .delete(auth.verifyToken(), validate(expenseValidation.deleteExpense), expenseController.deleteExpense);

module.exports = router;