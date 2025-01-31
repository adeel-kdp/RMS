const httpStatus = require('http-status');
const { RegularStock } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a regular stock
 * @param {Object} regularStockBody
 * @param {string} userId
 * @returns {Promise<RegularStock>}
 */
const createRegularStock = async (regularStockBody, userId) => {
  const session = await RegularStock.startSession();
  const today = new Date().toISOString().split('T')[0];

  session.startTransaction();
  try {
    // if (regularStockBody.items.some((item) => !item.hasOwnProperty('halfPlateConsumedQuantity'))) {
    //   await RegularStock.updateMany(
    //     {
    //       createdAt: { $gte: new Date(today).setHours(0, 0, 0, 0) },
    //       shopId: regularStockBody.shopId,
    //     },
    //     {
    //       $set: {
    //         'items.$[item].isAvailable': false,
    //       },
    //     },
    //     { arrayFilters: [{ 'item.isAvailable': true }], session }
    //   );
    // }
    const isAvailable = regularStockBody.items.some((item) => item.hasOwnProperty('halfPlateConsumedQuantity'));

    if (isAvailable) {
      await RegularStock.updateMany(
        {
          createdAt: { $gte: new Date(today).setHours(0, 0, 0, 0) },
          shopId: regularStockBody.shopId,
        },
        { $set: { 'items.$[item].isAvailable': false } },
        { arrayFilters: [{ 'item.isAvailable': true }], session }
      );
    }

    const newStock = await RegularStock.create([{ ...regularStockBody, userId }], { session });
    await session.commitTransaction();
    return newStock[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Query for regular stock
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryRegularStocks = async (filter, options) => {
  const regularstock = await RegularStock.find();
  return regularstock;
};

/**
 * Query for categories with pagination
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
const getRegularStocksWithPagination = async (filter, options) => {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;

  // Remove empty name filter
  if (filter.name === '') {
    delete filter.name;
  }

  // Prepare sort options
  let sortOptions = {};
  if (options.sortBy) {
    // Handle simple sortBy format (e.g., "name")
    if (!options.sortBy.includes(':')) {
      sortOptions[options.sortBy] = 1; // Default to ascending
    } else {
      // Handle detailed sortBy format (e.g., "name:desc")
      const [key, order] = options.sortBy.split(':');
      sortOptions[key] = order === 'desc' ? -1 : 1;
    }
  }

  // If filter.name exists, create case-insensitive regex
  if (filter.name) {
    filter.name = new RegExp(filter.name, 'i');
  }
  // filter.isActive = true;
  // Execute query with pagination
  const [regularStocks, totalRegularStocks] = await Promise.all([
    RegularStock.find(filter)
      .populate({
        path: 'items.productId',
        select: ['name', 'price', 'images', 'isShowcase'],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(), // Add lean() for better performance
    RegularStock.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalRegularStocks / limit);

  return {
    results: regularStocks,
    page,
    limit,
    totalPages,
    totalResults: totalRegularStocks,
  };
};

/**
 * Get regularstock by id
 * @param {ObjectId} id
 * @returns {Promise<RegularStock>}
 */
const getRegularStockById = async (id) => {
  return RegularStock.findById(id);
};

/**
 * Update regularstock by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<RegularStock>}
 */
const updateRegularStockById = async (id, updateBody) => {
  const regularstock = await getRegularStockById(id);
  if (!regularstock) {
    throw new ApiError(httpStatus.NOT_FOUND, 'RegularStock not found');
  }

  // If updating default status to true, remove default status from other regularstock
  if (updateBody.isDefault) {
    await RegularStock.updateMany({ userId: regularstock.userId }, { isDefault: false });
  }

  Object.assign(regularstock, updateBody);
  await regularstock.save();
  return regularstock;
};

/**
 * Delete regularstock by id
 * @param {ObjectId} id
 * @returns {Promise<RegularStock>}
 */
const deleteRegularStockById = async (id) => {
  const regularstock = await getRegularStockById(id);
  if (!regularstock) {
    throw new ApiError(httpStatus.NOT_FOUND, 'RegularStock not found');
  }
  await regularstock.remove();
  return regularstock;
};

const getTodayRegularStocks = async (shopId) => {
  const today = new Date().toISOString().split('T')[0];
  console.log(
    `createdAt: { $gte: ${new Date(today).setHours(0, 0, 0, 0)}, $lt: ${new Date(today).setHours(23, 59, 59, 999)} }`
  );
  const regularStocks = await RegularStock.find({
    shopId,
    createdAt: { $gte: new Date().setHours(0, 0, 0, 0), $lt: new Date().setHours(23, 59, 59, 999) },
  })
    .populate({
      path: 'items.productId',
      select: ['name', 'price'],
      // populate: {
      //   path: 'dealProducts.productId',
      //   select: 'name price',
      // },
    })
    .lean();
  const result = {};
  for (let i = 0; i < regularStocks.length; i++) {
    const stock = regularStocks[i];
    for (let j = 0; j < stock.items.length; j++) {
      const product = stock.items[j];
      // (halfPlateConsumedQuantity, fullPlateConsumedQuantity, isAvailable) means that prodcut is child product, other is parent
      if (
        // !result[product.productId._id] &&
        product.hasOwnProperty('fullPlateConsumedQuantity') &&
        product.hasOwnProperty('halfPlateConsumedQuantity')
        // product.isAvailable
      ) {
        if (product.isAvailable) {
          if (!result[product.productId._id]) {
            result[product.productId._id] = product;
            result[product.productId._id].count = 0;
          } else {
            result[product.productId._id] = { ...result[product.productId._id], ...product };
          }
        } else if (!result[product.productId._id]) {
          result[product.productId._id] = product;
          result[product.productId._id].count = 0;
        }
        result[product.productId._id].count += 1;
      }

      if (!result[product.productId._id] && !product.hasOwnProperty('halfPlateConsumedQuantity')) {
        result[product.productId._id] = product;
      } else if (
        !product.hasOwnProperty('fullPlateConsumedQuantity') &&
        !product.hasOwnProperty('halfPlateConsumedQuantity')
      ) {
        result[product.productId._id].quantity += product.quantity;
        result[product.productId._id].consumedQuantity += product.consumedQuantity;
      }
    }
  }

  return result;
};

module.exports = {
  createRegularStock,
  queryRegularStocks,
  getRegularStockById,
  updateRegularStockById,
  deleteRegularStockById,
  getRegularStocksWithPagination,
  getTodayRegularStocks,
};
