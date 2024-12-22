const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const shopService = require('../services/shop.service');

const createShop = catchAsync(async (req, res) => {
  const shop = await shopService.createShop(req.body, req.user);
  res.status(httpStatus.CREATED).send(shop);
});

const getShopsWithPagination = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'isActive']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  // Convert string values to appropriate types
  if (options.limit) options.limit = parseInt(options.limit);
  if (options.page) options.page = parseInt(options.page);
  
  const result = await shopService.queryShops(filter, options);
  res.send(result);
});

const getAllShops = catchAsync(async (req, res) => {
  const categories = await shopService.getAllShops();
  res.send(categories);
});

const getShop = catchAsync(async (req, res) => {
  const shop = await shopService.getShopById(req.params.shopId);
  if (!shop) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shop not found');
  }
  res.send(shop);
});

const updateShop = catchAsync(async (req, res) => {
  const shop = await shopService.updateShopById(req.params.shopId, req.body);
  res.send(shop);
}); 

const deleteShop = catchAsync(async (req, res) => {
  await shopService.deleteShopById(req.params.shopId);
  res.status(httpStatus.NO_CONTENT).send();
});

// const createSubShop = catchAsync(async (req, res) => {
//   const shop = await shopService.addSubShop(req.params.shopId, req.body);
//   res.status(httpStatus.CREATED).send(shop);
// });

// const updateSubShop = catchAsync(async (req, res) => {
//   const shop = await shopService.updateSubShop(
//     req.params.shopId,
//     req.params.subShopId,
//     req.body
//   );
//   res.send(shop);
// });

// const deleteSubShop = catchAsync(async (req, res) => {
//   const shop = await shopService.deleteSubShop(
//     req.params.shopId,
//     req.params.subShopId
//   );
//   res.send(shop);
// });

module.exports = {
  createShop,
  getShopsWithPagination,
  getShop,
  updateShop,
  deleteShop,
  getAllShops,
};


