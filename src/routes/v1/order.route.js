const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const orderValidation = require('../../validations/order.validation');
const orderController = require('../../controllers/order.controller');

const router = express.Router();

router
  .route('/')
  .post(auth.verifyToken(), validate(orderValidation.createOrder), orderController.createOrder)
  .get(orderController.getOrdersWithPagination);

router.route('/byCustomerId').get(auth.verifyToken(), orderController.getOrdersWithPaginationByCustomerId);

router.route('/:orderId').get(orderController.getOrder);

router.route('/updateOrderById/:orderId').put(auth.verifyToken(), orderController.updateOrderById);
router.route('/calculateZeroQuantityItemPrice').put(auth.verifyToken(), orderController.updateOrderById);

router.route('/cancelOrderById/:orderId').delete(auth.verifyToken(), orderController.cancelOrderById);

module.exports = router;
  