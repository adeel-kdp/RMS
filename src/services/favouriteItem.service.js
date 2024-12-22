const httpStatus = require('http-status');
const { PaymentCard } = require('../models');
const ApiError = require('../utils/ApiError');
const FavouriteItem = require('../models/favouriteItem.model');

/**
 * Create a payment card
 * @param {Object} cardBody
 * @param {string} userId
 * @returns {Promise<PaymentCard>}
 */
const createFavouriteItem = async (productId, userId) => {
  const existingFavouriteItem = await FavouriteItem.findOne({ userId, product: productId });
  if (existingFavouriteItem) {
    console.log("existingFavouriteItem", existingFavouriteItem)
    await FavouriteItem.findByIdAndRemove(existingFavouriteItem._id);
    return false;
  } else {
    await FavouriteItem.create({ userId, product: productId });
    return true;
  }
};

/**
 * Query for favourite items
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryFavouriteItems = async (filter, options) => {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;
  const results = await FavouriteItem.paginate(
    filter,
    {
      ...options,
      offset: skip,
      populate: 'product',
    }
  );
  return results;
};

/**
 * Get favourite item by id
 * @param {ObjectId} id
 * @returns {Promise<FavouriteItem>}
 */
const getFavouriteItemById = async (id) => {
  return FavouriteItem.findById(id);
};

/**
 * Get favourite item by product id
 * @param {ObjectId} productId
 * @param {ObjectId} userId
 * @returns {Promise<FavouriteItem>}
 */
const getFavouriteItemByProductId = async (productId, userId) => {
  return FavouriteItem.findOne({ userId, product: productId });
};
/**
 * Delete favourite item by id
 * @param {ObjectId} favouriteItemId
 * @returns {Promise<FavouriteItem>}
 */
const deleteFavouriteItemById = async (favouriteItemId) => {
  const favouriteItem = await getFavouriteItemById(favouriteItemId);
  if (!favouriteItem) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Favourite item not found');
  }
  await favouriteItem.remove();
  return favouriteItem;
};
module.exports = {
  createFavouriteItem,
  queryFavouriteItems,
  getFavouriteItemById,
  deleteFavouriteItemById,
  getFavouriteItemByProductId
};