const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { orderService } = require('../services');
const pick = require('../utils/pick');

const createOrder = catchAsync(async (req, res) => {
  const order = await orderService.createOrder(req.user, req.body);
  res.status(httpStatus.CREATED).send(order);
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

module.exports = {
  createOrder,
  getOrdersWithPagination,
  getOrdersWithPaginationByCustomerId,
  getOrder,
};
