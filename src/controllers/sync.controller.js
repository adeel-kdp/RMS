const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { firebaseService } = require('../services');

const syncOfflineOrders = catchAsync(async (req, res) => {
  const orders = await firebaseService.syncOfflineOrders(req.body.orders);
  res.status(httpStatus.OK).send(orders);
});

const getUnsynedOrders = catchAsync(async (req, res) => {
  const orders = await firebaseService.getUnsynedOrders();
  res.status(httpStatus.OK).send(orders);
});

module.exports = {
  syncOfflineOrders,
  getUnsynedOrders
};