const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { orderService } = require('../services');
const pick = require('../utils/pick');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

const createOrder = catchAsync(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await orderService.createOrder(req.user, req.body, session);
      res.status(httpStatus.CREATED).send(order);
    });
  } finally {
    await session.endSession();
  }
});

const updateOrderById = catchAsync(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await orderService.updateOrderById(req.user, req.params.orderId, req.body, session);
      res.send(order);
    });
  } finally {
    await session.endSession();
  }
});

const cancelOrderById = catchAsync(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await orderService.cancelOrderById(req.user, req.params.orderId, session);
      res.send(order);
    });
  } finally {
    await session.endSession();
  }
});

const getOrdersWithPagination = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['orderId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  // Convert string values to appropriate types
  if (options.limit) options.limit = parseInt(options.limit);
  if (options.page) options.page = parseInt(options.page);
  const result = await orderService.queryOrders(filter, options);

  res.send(result);
});

const getOrdersWithPaginationByCustomerId = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['orderId']);
  filter.customerId = req.user; // Assuming user is authenticated and user ID is stored in req.user
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  // Convert string values to appropriate types
  if (options.limit) options.limit = parseInt(options.limit);
  if (options.page) options.page = parseInt(options.page);

  const result = await orderService.queryOrders(filter, options);
  res.send(result);
});

const getOrder = catchAsync(async (req, res) => {
  const order = await orderService.getOrderById(req.params.orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }
  res.send(order);
});
const getOrderByOrderId = catchAsync(async (req, res) => {
  const order = await orderService.getOrderByOrderId(req.params.orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }
  res.send(order);
});

const calculateZeroQuantityItemPrice = catchAsync(async (req, res) => {
  const total = await orderService.calculateZeroQuantityItemPrice();
  res.send({ total });
});

const orderKpis = catchAsync(async (req, res) => {
  const totalOrders = await orderService.calculateTodayTotalCountOrders();
  const totalRevenue = await orderService.calculateTotalRevenue();
  
  res.send({
    totalOrders,
    totalRevenue,
   
  });
});

const getOrderAnalytics = catchAsync(async (req, res) => {
  // const { fromDate, toDate } = req.query;
  const result = await orderService.getOrderAnalytics(req.query);
  res.send(result);
});

module.exports = {
  createOrder,
  getOrdersWithPagination,
  getOrdersWithPaginationByCustomerId,
  getOrder,
  updateOrderById,
  cancelOrderById,
  calculateZeroQuantityItemPrice,
  orderKpis,
  getOrderByOrderId,
  getOrderAnalytics
};
