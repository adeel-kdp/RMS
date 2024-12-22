const config = require('../config/config');
const Order = require('../models/order.model');
const jwt = require('jsonwebtoken');

/**
 * Create an order
 * @param {Object} orderBody
 * @returns {Promise<Order>}
 */

const createOrder = async (userId, orderBody) => {
  return Order.create({ ...orderBody, customerId: userId });
};

/**
 * Query for orders
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryOrders = async (filter, options) => {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;

  const filtered = {};
  Object.keys(filter).forEach((key) => {
    if (filter[key] !== '') {
      filtered[key] = filter[key];
    }
  });
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

  // Execute query with pagination
  const [orders, totalOrders] = await Promise.all([
    Order.find(filtered).populate('customerId', 'name').sort(sortOptions).skip(skip).limit(limit).lean(), // Add lean() for better performance
    Order.countDocuments(filtered),
  ]);

  const totalPages = Math.ceil(totalOrders / limit);

  return {
    results: orders,
    page,
    limit,
    totalPages,
    totalResults: totalOrders,
  };
};

/**
 * Get order by id
 * @param {ObjectId} id
 * @returns {Promise<Order>}
 */
const getOrderById = async (id) => {
  return Order.findById(id)
    .populate({
      path: 'customerId',
      select: 'name email', // Add more fields if needed
    })
    .populate({
      path: 'items.product',
      model: 'Product',
      select: 'name price images category', // Select specific fields
    })
    .lean();
};

module.exports = {
  createOrder,
  queryOrders,
  getOrderById,
};
