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
  }).sort({ createdAt: 1 });

  if (!regularStocks.length) {
    throw new Error('No Stocks Found For Today');
  }

  // Create a map of items with deep clone to avoid reference issues
  const items = orderBody.items.reduce((acc, item) => {
    const key = item?.parentProduct || item.productId;
    if (!acc[key]) {
      acc[key] = item?.parentProduct ? [] : { ...item, remainingQuantity: item.quantity };
    }else if (!item?.parentProduct) {
      acc[key] = { ...item, quantity: acc[key].quantity + item.quantity, remainingQuantity: acc[key].remainingQuantity + item.quantity };
    }
    if (item?.parentProduct) {
      acc[key].push({ ...item, remainingQuantity: item.quantity });
    }
    if (item?.dealProducts?.length) {
      item.dealProducts.forEach((product) => {
        if (acc[product.productId]) {
          acc[product.productId].remainingQuantity += product.quantity * item.quantity;
          acc[product.productId].quantity += product.quantity * item.quantity;
        } else {
          acc[product.productId] = { ...product, remainingQuantity: product.quantity * item.quantity, quantity: product.quantity * item.quantity };
        }
      });
    }
    return acc;
  }, {});

  // Process regular stocks
  await Promise.all(
    regularStocks.map(async (regularStock) => {
      let isModified = false;
      const updatedItems = regularStock.items.map((stock) => {
        const orderItem = items[stock.productId];
        if (!orderItem) return stock;

        const stockCopy = { ...stock };
        if (orderItem?.remainingQuantity > 0 && !orderItem?.parentProduct) {
          // Handle regular products
          const availableQuantity = stock.quantity - (stock.consumedQuantity || 0);
          const quantityToConsume = Math.min(orderItem.remainingQuantity, availableQuantity);

          if (quantityToConsume > 0) {
            stock.consumedQuantity = (stock.consumedQuantity || 0) + quantityToConsume;
            orderItem.remainingQuantity -= quantityToConsume;
            isModified = true;
          }
        } else if (orderItem.length > 0) {
          // Handle plates
          for (let i = 0; i < orderItem.length; i++) {
            const element = orderItem[i];

            if (element?.parentProduct && element?.remainingQuantity > 0) {
              console.log('element', element);

              // Handle products with parent products (plates)
              if (element.plateType === 'full') {
                stock.fullPlateConsumedQuantity = (stock.fullPlateConsumedQuantity || 0) + element.remainingQuantity;

              } else if (element.plateType === 'half') {
                stock.halfPlateConsumedQuantity = (stock.halfPlateConsumedQuantity || 0) + element.remainingQuantity;
              }
              orderItem[i].remainingQuantity = 0;
              isModified = true;
            }
          }
        }
        return stock;
      });

      // Only save if modifications were made
      if (isModified) {
        await RegularStock.findOneAndUpdate(
          { _id: regularStock._id },
          { $set: { items: updatedItems } },
          { new: true, session }
        );
      }
    })
  );

  // Handle stockable products
  await Promise.all(
    Object.values(items)
      .filter((item) => item?.isStockAble && item?.remainingQuantity > 0)
      .map(async (item) => {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.remainingQuantity } }, { session });
        item.remainingQuantity = 0;
      })
  );

  const unfulfilledItems = Object.values(items).flatMap((item) =>
    Array.isArray(item) ? item.filter((subItem) => subItem.remainingQuantity > 0) : item.remainingQuantity > 0 ? [item] : []
  );

  if (unfulfilledItems.length > 0) {
    throw new Error(`Insufficient stock for items: ${unfulfilledItems.map((item) => item.name).join(', ')}`);
  }

  // Create the order within the transaction
  const [order] = await Order.create([{ ...orderBody, userId }], { session });

  return order;
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
