const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { regularStockService } = require('../services');
const pick = require('../utils/pick');

const createRegularStock = catchAsync(async (req, res) => {
  const regularStock = await regularStockService.createRegularStock(req.body, req.user);
  res.status(httpStatus.CREATED).send(regularStock);
});

const getRegularStocks = catchAsync(async (req, res) => {
  const filter = { userId: req.user };
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await regularStockService.queryRegularStocks(filter, options);
  res.send(result);
});

const getRegularStocksWithPagination = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'isActive']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  // Convert string values to appropriate types
  if (options.limit) options.limit = parseInt(options.limit);
  if (options.page) options.page = parseInt(options.page);
  
  const result = await regularStockService.getRegularStocksWithPagination(filter, options);
  res.send(result);
});

const getRegularStock = catchAsync(async (req, res) => {
  const regularStock = await regularStockService.getRegularStockById(req.params.regularStockId);
  if (!regularStock) {
    throw new ApiError(httpStatus.NOT_FOUND, 'RegularStock not found');
  }
  if (regularStock.userId.toString() !== req.user) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  res.send(regularStock);
});

const updateRegularStock = catchAsync(async (req, res) => {
  const regularStock = await regularStockService.getRegularStockById(req.params.regularStockId);
  if (regularStock.userId.toString() !== req.user) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  const updatedRegularStock = await regularStockService.updateRegularStockById(req.params.regularStockId, req.body);
  res.send(updatedRegularStock);
});

const deleteRegularStock = catchAsync(async (req, res) => {
  const regularStock = await regularStockService.getRegularStockById(req.params.regularStockId);
  if (regularStock.userId.toString() !== req.user) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  await regularStockService.deleteRegularStockById(req.params.regularStockId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getTodayRegularStocks = catchAsync(async (req, res) => {
  const regularStocks = await regularStockService.getTodayRegularStocks(req.params.shopId);
  res.send(regularStocks);
});
const getStockDetailsByDate = catchAsync(async (req, res) => {
  const regularStocks = await regularStockService.getStockDetailsByDate(req.query);
  res.send(regularStocks);
});


module.exports = {
  createRegularStock,
  getRegularStocks,
  getRegularStock,
  updateRegularStock,
  deleteRegularStock,
  getRegularStocksWithPagination,
  getTodayRegularStocks,
  getStockDetailsByDate
};