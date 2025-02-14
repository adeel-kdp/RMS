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
    } else if (!item?.parentProduct) {
      acc[key] = {
        ...item,
        quantity: acc[key].quantity + item.quantity,
        remainingQuantity: acc[key].remainingQuantity + item.quantity,
      };
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
          acc[product.productId] = {
            ...product,
            remainingQuantity: product.quantity * item.quantity,
            quantity: product.quantity * item.quantity,
          };
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
        } else if (orderItem.length > 0 && stock.isAvailable) {
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
  return Order.findOne({orderId: id})
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

/**
 * Update an order
 * @param {string} orderId
 * @param {Object} updateBody
 * @returns {Promise<Order>}
 */
const updateOrderById = async (userId, orderId, updateBody, session) => {
  // First get the existing order
  const existingOrder = await Order.findOne({ _id: orderId });

  if (!existingOrder) {
    throw new Error('Order not found');
  }

  if (existingOrder.status === 'CANCELLED' || existingOrder.status === 'DELIVERED') {
    throw new Error('Cannot update order in current status');
  }

  // If items are being updated, we need to handle stock changes
  if (updateBody.items) {
    // First, return the quantities back to stock from existing order
    await revertStockChanges(existingOrder, session);

    // Then process new quantities like in create order
    const today = new Date().toISOString().split('T')[0];
    const regularStocks = await RegularStock.find({
      userId,
      shopId: existingOrder.shopId,
      createdAt: {
        $gte: new Date(today).setHours(0, 0, 0, 0),
        $lt: new Date(today).setHours(23, 59, 59, 999),
      },
    }).sort({ createdAt: 1 });

    if (!regularStocks.length) {
      throw new Error('No Stocks Found For Today');
    }

    // Create items map similar to createOrder
    const items = updateBody.items.reduce((acc, item) => {
      const key = item?.parentProduct || item.productId;
      if (!acc[key]) {
        acc[key] = item?.parentProduct ? [] : { ...item, remainingQuantity: item.quantity };
      } else if (!item?.parentProduct) {
        acc[key] = {
          ...item,
          quantity: acc[key].quantity + item.quantity,
          remainingQuantity: acc[key].remainingQuantity + item.quantity,
        };
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
            acc[product.productId] = {
              ...product,
              remainingQuantity: product.quantity * item.quantity,
              quantity: product.quantity * item.quantity,
            };
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

          if (orderItem?.remainingQuantity > 0 && !orderItem?.parentProduct) {
            const availableQuantity = stock.quantity - (stock.consumedQuantity || 0);
            const quantityToConsume = Math.min(orderItem.remainingQuantity, availableQuantity);

            if (quantityToConsume > 0) {
              stock.consumedQuantity = (stock.consumedQuantity || 0) + quantityToConsume;
              orderItem.remainingQuantity -= quantityToConsume;
              isModified = true;
            }
          } else if (orderItem.length > 0 && stock.isAvailable) {
            for (let i = 0; i < orderItem.length; i++) {
              const element = orderItem[i];
              if (element?.parentProduct && element?.remainingQuantity > 0) {
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
      Array.isArray(item)
        ? item.filter((subItem) => subItem.remainingQuantity > 0)
        : item.remainingQuantity > 0
        ? [item]
        : []
    );

    if (unfulfilledItems.length > 0) {
      throw new Error(`Insufficient stock for items: ${unfulfilledItems.map((item) => item.name).join(', ')}`);
    }
  }

  // Update the order
  const updatedOrder = await Order.findByIdAndUpdate(orderId, updateBody, { new: true, session });

  return updatedOrder;
};

/**
 * Cancel an order
 * @param {string} orderId
 * @returns {Promise<Order>}
 */
const cancelOrderById = async (userId, orderId, session) => {
  const order = await Order.findOne({ _id: orderId, userId });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.paymentStatus === 'DELIVERED') {
    throw new Error('Cannot cancel delivered order');
  }

  if (order.paymentStatus === 'cancelled') {
    throw new Error('Order is already cancelled');
  }

  // Revert all stock changes
  await revertStockChanges(order, session);

  // Update order paymentStatus to cancelled
  const cancelledOrder = await Order.findByIdAndUpdate(orderId, { $set: { paymentStatus: 'cancelled' } }, { new: true, session });

  return cancelledOrder;
};

/**
 * Helper function to revert stock changes
 * @param {Object} order
 * @returns {Promise<void>}
 */
const revertStockChanges = async (order, session) => {
  const today = new Date(order.createdAt).toISOString().split('T')[0];

  // Get regular stocks for the order date
  const regularStocks = await RegularStock.find({
    userId: order.userId,
    shopId: order.shopId,
    createdAt: {
      $gte: new Date(today).setHours(0, 0, 0, 0),
      $lt: new Date(today).setHours(23, 59, 59, 999),
    },
  });

  // Create a map of items to revert
  const items = order.items.reduce((acc, item) => {
    const key = item?.parentProduct || item.productId;
    if (!acc[key]) {
      acc[key] = item?.parentProduct ? [] : { ...item };
    }
    if (item?.parentProduct) {
      acc[key].push(item);
    }
    if (item?.dealProducts?.length) {
      item.dealProducts.forEach((product) => {
        if (!acc[product.productId]) {
          acc[product.productId] = { ...product, quantity: product.quantity * item.quantity };
        } else {
          acc[product.productId].quantity += product.quantity * item.quantity;
        }
      });
    }
    return acc;
  }, {});

  // Revert regular stock changes
  await Promise.all(
    regularStocks.map(async (regularStock) => {
      let isModified = false;
      const updatedItems = regularStock.items.map((stock) => {
        const orderItem = items[stock.productId];
        if (!orderItem) return stock;

        if (!orderItem?.parentProduct) {
          if (stock.consumedQuantity) {
            stock.consumedQuantity = Math.max(0, stock.consumedQuantity - orderItem.quantity);
            isModified = true;
          }
        } else if (Array.isArray(orderItem)) {
          orderItem.forEach((plate) => {
            if (plate.plateType === 'full' && stock.fullPlateConsumedQuantity) {
              stock.fullPlateConsumedQuantity = Math.max(0, stock.fullPlateConsumedQuantity - plate.quantity);
              isModified = true;
            } else if (plate.plateType === 'half' && stock.halfPlateConsumedQuantity) {
              stock.halfPlateConsumedQuantity = Math.max(0, stock.halfPlateConsumedQuantity - plate.quantity);
              isModified = true;
            }
          });
        }
        return stock;
      });

      if (isModified) {
        await RegularStock.findOneAndUpdate(
          { _id: regularStock._id },
          { $set: { items: updatedItems } },
          { new: true, session }
        );
      }
    })
  );

  // Revert stockable product changes
  await Promise.all(
    Object.values(items)
      .filter((item) => item?.isStockAble)
      .map(async (item) => {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } }, { session });
      })
  );
};

const calculateZeroQuantityItemPrice = async () => {
  const today = new Date().toISOString().split('T')[0];
  const orders = await Order.find({ createdAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59.999Z') }, 'items.quantity': 0 });

  const total = orders.reduce((acc, order) => {
    const zeroQuantityItems = order.items.filter((item) => item.quantity === 0);
    return acc + zeroQuantityItems.reduce((itemAcc, item) => itemAcc + item.price, 0);
  }, 0);

  console.log(`Total price of items with 0 quantity: ${total}`);

  return total;
};

const calculateTodayTotalCountOrders = async () => {
  const today = new Date().toISOString().split('T')[0];
  const count = await Order.countDocuments({ createdAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59.999Z') } });

  console.log(`Total count of orders for today: ${count}`);

  return count;
};

const calculateTotalRevenue = async () => {
  const today = new Date().toISOString().split('T')[0];
  const revenue = await Order.aggregate([
    { $match: { createdAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59.999Z') } } },
    { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
  ]);

  console.log(`Total revenue for today: ${revenue[0].revenue}`);

  return revenue[0].revenue;
};

module.exports = {
  createOrder,
  queryOrders,
  getOrderById,
  updateOrderById,
  cancelOrderById,
  calculateZeroQuantityItemPrice,
  calculateTodayTotalCountOrders,
  calculateTotalRevenue,
};
