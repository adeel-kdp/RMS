const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { favouriteItemService } = require('../services');
const pick = require('../utils/pick');

const createFavouriteItem = catchAsync(async (req, res) => {
  const favouriteItem = await favouriteItemService.createFavouriteItem(req.body.productId, req.user);
  res.status(httpStatus.CREATED).send(favouriteItem);
});

const getFavouriteItems = catchAsync(async (req, res) => {
  const filter = { userId: req.user };
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await favouriteItemService.queryFavouriteItems(filter, options);
  res.send(result);
});

const getFavouriteItem = catchAsync(async (req, res) => {
  const favouriteItem = await favouriteItemService.getFavouriteItemById(req.params.id);
  if (!favouriteItem) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Favourite item not found');
  }
  if (favouriteItem.userId.toString() !== req.user) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  res.send(favouriteItem);
});

const getFavouriteItemByProductId = catchAsync(async (req, res) => {
  const favouriteItem = await favouriteItemService.getFavouriteItemByProductId(req.params.id, req.user);
  res.send(!!favouriteItem);
});

const deleteFavouriteItem = catchAsync(async (req, res) => {
  const favouriteItem = await favouriteItemService.getFavouriteItemById(req.params.id);
  if (favouriteItem.userId.toString() !== req.user) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  await favouriteItemService.deleteFavouriteItemById(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createFavouriteItem,
  getFavouriteItems,
  getFavouriteItem,
  deleteFavouriteItem,
  getFavouriteItemByProductId,
};
