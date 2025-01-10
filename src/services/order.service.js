const { RegularStock } = require('../models');
const Order = require('../models/order.model');
const mongoose = require('mongoose');
const Product = require('../models/product.model');

/**
 * Create an order
 * @param {Object} orderBody
 * @returns {Promise<Order>}
 */

const createOrder = async (userId, orderBody, session) => {
  const today = new Date().toISOString().split('T')[0];
  const regularStocks = await RegularStock.find({
    userId,
    shopId: orderBody.shopId,
    createdAt: {
      $gte: new Date(today).setHours(0, 0, 0, 0),
      $lt: new Date(today).setHours(23, 59, 59, 999),
    },
  })
    .sort({ createdAt: 1 })
    .session(session);

  if (!regularStocks.length) {
    throw new Error('No Stocks Found For Today');
  }
  // Create a map of items for easier lookup
  const items = orderBody.items.reduce((acc, item) => {
    acc[item.productId] = { ...item };
    return acc;
  }, {});

  await Promise.all(
    regularStocks.map(async (regularStock) => {
      let isModified = false;
      regularStock.items.forEach((stock) => {
        const orderItem = items[stock.productId];
        console.log("orderItem ====>>>",orderItem);
        if (!orderItem) return;

        if (orderItem.quantity && !orderItem.parentProduct) {
          // Handle regular products
          console.log("22  ====>>>");
          if (stock.quantity > stock.consumedQuantity) {
          console.log("33  ====>>>");

            const availableQuantity = stock.quantity - (stock.consumedQuantity || 0);
            const quantityToConsume = Math.min(orderItem.quantity, availableQuantity);

            stock.consumedQuantity = (stock.consumedQuantity || 0) + quantityToConsume;
            items[stock.productId] -= quantityToConsume;
          console.log("44  ====>>>");

            isModified = true;
          }
        } else if (orderItem.parentProduct) {
          console.log("55  ====>>>");

          // Handle products with parent products (plates)
          stock.fullPlateConsumedQuantity = (stock.fullPlateConsumedQuantity || 0) + orderItem.quantity;
          stock.halfPlateConsumedQuantity = (stock.halfPlateConsumedQuantity || 0) + orderItem.quantity;
          items[stock.productId] -= orderItem.quantity;
          isModified = true;
        }
      });
      console.log("66  ====>>>");

      // Only save if modifications were made
      if (isModified) {
        await RegularStock.findOneAndUpdate(
          { _id: regularStock._id },
          {
            $set: {
              items: regularStock.items,
            },
          },
          {
            new: true,
            session,
          }
        );
      }
    }),
    Object.entries(items).map(async ([productId, item]) => {
      if (item.isStockAble) {
        await Product.findByIdAndUpdate(productId, {
          $inc: {
            stock: -item.quantity,
          },
        });
      }
    })
  );

  // Verify all items were fulfilled
  const unfulfilledItems = Object.values(items).filter((item) => item.quantity > 0);
  console.log("unfulfilledItems", unfulfilledItems);
  
  if (unfulfilledItems.length > 0) {
    throw new Error(`Insufficient stock for items: ${unfulfilledItems.map((item) => item.name).join(', ')}`);
  }

  // // Create the order within the transaction
  const order = await Order.create(
    [
      {
        ...orderBody,
        userId: userId,
      },
    ],
    { session }
  );

  // Commit the transaction
  return order[0]; // Return the first (and only) created order

  // return Order.create({ ...orderBody, userId: userId });
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
