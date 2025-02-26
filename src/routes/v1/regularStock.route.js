const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const regularStockValidation = require('../../validations/regularStock.validation');
const regularStockController = require('../../controllers/regularStock.controller');

const router = express.Router();
router.route('/getStockDetailsByDate').get(auth.verifyToken(), regularStockController.getStockDetailsByDate);

router
  .route('/')
  .post(auth.verifyToken(), validate(regularStockValidation.createRegularStock), regularStockController.createRegularStock)
  .get(auth.verifyToken(), regularStockController.getRegularStocksWithPagination);

router
  .route('/:regularStockId')
  .get(auth.verifyToken(), validate(regularStockValidation.getRegularStock), regularStockController.getRegularStock)
  .put(auth.verifyToken(), validate(regularStockValidation.updateRegularStock), regularStockController.updateRegularStock)
  .delete(
    auth.verifyToken(),
    validate(regularStockValidation.deleteRegularStock),
    regularStockController.deleteRegularStock
  );

router.route('/todayStock/:shopId').get(auth.verifyToken(), regularStockController.getTodayRegularStocks);

module.exports = router;
