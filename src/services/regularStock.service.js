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
  return RegularStock.create({ ...regularStockBody, userId });
};

/**
 * Query for regular stock
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryRegularStocks = async (filter, options) => {
  const regularstock = await RegularStock.find()
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
      .sort({ updatedAt: -1 })
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

module.exports = {
  createRegularStock,
  queryRegularStocks,
  getRegularStockById,
  updateRegularStockById,
  deleteRegularStockById,
  getRegularStocksWithPagination
};