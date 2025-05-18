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
  let refresh = false;
  const orderDate = orderBody.orderDate ? new Date(orderBody.orderDate) : new Date();
  const today = orderDate.toISOString().split('T')[0];
  
  // Always use session in MongoDB queries to ensure consistency
  const regularStocks = await RegularStock.find({
    userId,
    shopId: orderBody.shopId,
    createdAt: {
      $gte: new Date(today).setHours(0, 0, 0, 0),
      $lt: new Date(today).setHours(23, 59, 59, 999),
    },
  }, null, { session }).sort({ createdAt: 1 });

  if (!regularStocks.length) {
    throw new Error('No Stocks Found For Today');
  }

  // Create a map of items with deep clone to avoid reference issues
  const items = orderBody.items.reduce((acc, item) => {
    const key = item?.parentProduct || item.productId;
    if (!acc[key]) {
      acc[key] = item?.parentProduct ? [] : { ...item, remainingQuantity: item.quantity };
    } else if (!item?.parentProduct) {
      // Fix: Use spread operator to ensure proper merging
      acc[key] = {
        ...acc[key],
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
  const stockUpdatePromises = regularStocks.map(async (regularStock) => {
    let isModified = false;
    const updatedItems = regularStock.items.map((stock) => {
      const orderItem = items[stock.productId.toString()]; // Ensure string comparison
      if (!orderItem) return stock;

      // Create a copy to avoid mutation
      const stockCopy = { ...stock.toObject() };
      
      if (orderItem?.remainingQuantity > 0 && !orderItem?.parentProduct) {
        // Handle regular products
        const availableQuantity = stockCopy.quantity - (stockCopy.consumedQuantity || 0);
        const quantityToConsume = Math.min(orderItem.remainingQuantity, availableQuantity);

        if (quantityToConsume > 0) {
          stockCopy.consumedQuantity = (stockCopy.consumedQuantity || 0) + quantityToConsume;
          orderItem.remainingQuantity -= quantityToConsume;
          isModified = true;
        }
        if (availableQuantity <= 12) refresh = true;
      } else if (Array.isArray(orderItem) && stockCopy.isAvailable) {
        // Handle plates
        for (let i = 0; i < orderItem.length; i++) {
          const element = orderItem[i];

          if (element?.parentProduct && element?.remainingQuantity > 0) {
            // Improved plate type detection
            if (element.plateType === 'full') {
              stockCopy.fullPlateConsumedQuantity = (stockCopy.fullPlateConsumedQuantity || 0) + element.remainingQuantity;
            } else if (element.plateType === 'half') {
              stockCopy.halfPlateConsumedQuantity = (stockCopy.halfPlateConsumedQuantity || 0) + element.remainingQuantity;
            }
            orderItem[i].remainingQuantity = 0;
            isModified = true;
          }
        }
      }
      return stockCopy;
    });
    
    // Only save if modifications were made
    if (isModified) {
      await RegularStock.findOneAndUpdate(
        { _id: regularStock._id },
        { $set: { items: updatedItems } },
        { new: true, session }
      );
    }
  });

  await Promise.all(stockUpdatePromises);

  // Handle stockable products
  const stockablePromises = Object.values(items)
    .filter((item) => !Array.isArray(item) && item?.isStockAble && item?.remainingQuantity > 0)
    .map(async (item) => {
      await Product.findByIdAndUpdate(
        item.productId, 
        { $inc: { stock: -item.remainingQuantity } }, 
        { session }
      );
      item.remainingQuantity = 0;
    });

  await Promise.all(stockablePromises);

  // Check for unfulfilled items
  const unfulfilledItems = Object.values(items).flatMap((item) =>
    Array.isArray(item) 
      ? item.filter((subItem) => subItem.remainingQuantity > 0) 
      : item.remainingQuantity > 0 ? [item] : []
  );

  if (unfulfilledItems.length > 0) {
    throw new Error(`Insufficient stock for items: ${unfulfilledItems.map((item) => item.name).join(', ')}`);
  }

  // Create the order within the transaction
  const orderBodyWithDate = orderBody.orderDate
    ? { ...orderBody, createdAt: new Date(orderBody.orderDate), updatedAt: new Date(orderBody.orderDate) }
    : orderBody;

  delete orderBodyWithDate.orderDate;
  const [order] = await Order.create([{ ...orderBodyWithDate, userId }], { session });

  order.refresh = refresh;
  return refresh;
};

/**
 * Update an order
 * @param {string} orderId
 * @param {Object} updateBody
 * @returns {Promise<Order>}
 */
const updateOrderById = async (userId, orderId, updateBody, session) => {
  // First get the existing order with session
  const existingOrder = await getOrderById(orderId);
  
  if (!existingOrder) {
    throw new Error('Order not found');
  }

  if (existingOrder.status === 'CANCELLED' || existingOrder.status === 'DELIVERED') {
    throw new Error('Cannot update order in current status');
  }

  // If items are being updated, handle stock changes
  if (updateBody.items) {
    // First, revert stock changes from existing order
    await revertStockChanges(existingOrder, session);
    
    // Handle deal products transfer from existing to new order
    for (let i = 0; i < existingOrder.items.length; i++) {
      const item = existingOrder.items[i];
      if (item?.dealProducts?.length) {
        const updateIndex = updateBody.items.findIndex((updateItem) => updateItem.name === item.name);
        if (updateIndex !== -1) {
          updateBody.items[updateIndex].dealProducts = item.dealProducts;
        }
      }
    }
    
    // Process new stock consumption like in createOrder
    const today = existingOrder.createdAt.toISOString().split('T')[0];
    const regularStocks = await RegularStock.find({
      userId,
      shopId: existingOrder.shopId,
      createdAt: {
        $gte: new Date(today).setHours(0, 0, 0, 0),
        $lt: new Date(today).setHours(23, 59, 59, 999),
      },
    }, null, { session }).sort({ createdAt: 1 });

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
          ...acc[key],
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

    // Process regular stocks (same logic as createOrder)
    await Promise.all(
      regularStocks.map(async (regularStock) => {
        let isModified = false;
        const updatedItems = regularStock.items.map((stock) => {
          const orderItem = items[stock.productId.toString()];
          if (!orderItem) return stock;

          const stockCopy = { ...stock.toObject() };

          if (orderItem?.remainingQuantity > 0 && !orderItem?.parentProduct) {
            const availableQuantity = stockCopy.quantity - (stockCopy.consumedQuantity || 0);
            const quantityToConsume = Math.min(orderItem.remainingQuantity, availableQuantity);

            if (quantityToConsume > 0) {
              stockCopy.consumedQuantity = (stockCopy.consumedQuantity || 0) + quantityToConsume;
              orderItem.remainingQuantity -= quantityToConsume;
              isModified = true;
            }
          } else if (Array.isArray(orderItem) && stockCopy.isAvailable) {
            for (let i = 0; i < orderItem.length; i++) {
              const element = orderItem[i];
              if (element?.parentProduct && element?.remainingQuantity > 0) {
                if (element.plateType === 'full' || 
                    element.name.toLowerCase().includes('full') || 
                    element.name.toLowerCase().includes('double')) {
                  stockCopy.fullPlateConsumedQuantity = (stockCopy.fullPlateConsumedQuantity || 0) + element.remainingQuantity;
                } else {
                  stockCopy.halfPlateConsumedQuantity = (stockCopy.halfPlateConsumedQuantity || 0) + element.remainingQuantity;
                }
                orderItem[i].remainingQuantity = 0;
                isModified = true;
              }
            }
          }
          return stockCopy;
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
        .filter((item) => !Array.isArray(item) && item?.isStockAble && item?.remainingQuantity > 0)
        .map(async (item) => {
          await Product.findByIdAndUpdate(
            item.productId, 
            { $inc: { stock: -item.remainingQuantity } }, 
            { session }
          );
          item.remainingQuantity = 0;
        })
    );

    const unfulfilledItems = Object.values(items).flatMap((item) =>
      Array.isArray(item)
        ? item.filter((subItem) => subItem.remainingQuantity > 0)
        : item.remainingQuantity > 0 ? [item] : []
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
  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (order.paymentStatus === 'DELIVERED') {
    throw new Error('Cannot cancel delivered order');
  }

  if (order.paymentStatus === 'cancelled') {
    throw new Error('Order is already cancelled');
  }

  // const orderCopy = {...order.toObject()}
  // Revert all stock changes
  await revertStockChanges(order, session);

  // Update order paymentStatus to cancelled
  const cancelledOrder = await Order.findByIdAndUpdate(
    orderId,
    { $set: { paymentStatus: 'cancelled' } },
    { new: true, session }
  );

  return cancelledOrder;
};

/**
 * Helper function to revert stock changes
 * @param {Object} order
 * @param {Object} session - MongoDB session
 * @returns {Promise<void>}
 */
const revertStockChanges = async (order, session) => {
  const today = new Date(order.createdAt).toISOString().split('T')[0];

  // Get regular stocks for the order date with session
  const regularStocks = await RegularStock.find({
    // userId: order.userId,
    shopId: order.shopId,
    createdAt: {
      $gte: new Date(today).setHours(0, 0, 0, 0),
      $lt: new Date(today).setHours(23, 59, 59, 999),
    },
  }, null, { session });

  
  // Create a map of items to revert with better handling
  const items = order.items.reduce((acc, item) => {
    const key = item?.parentProduct || (item.productId?._id || item.productId);
    
    if (!acc[key]) {
      acc[key] = item?.parentProduct ? [] : { ...item, quantity: 0 };
    }
    
    if (item?.parentProduct) {
      acc[key].push(item);
    } else if (!item?.parentProduct) {
      acc[key].quantity = (acc[key].quantity || 0) + item.quantity;
    }
    
    // Handle deal products properly
    if (item?.productId?.dealProducts?.length) {
      item.productId.dealProducts.forEach((product) => {
        const dealKey = product.productId;
        if (!acc[dealKey]) {
          acc[dealKey] = { 
            ...product, 
            quantity: product.quantity * item.quantity,
            isStockAble: product.isStockAble 
          };
        } else {
          acc[dealKey].quantity += product.quantity * item.quantity;
        }
      });
    }
    return acc;
  }, {});

  // Revert regular stock changes
  const revertPromises = regularStocks.map(async (regularStock) => {
    let isModified = false;
    const updatedItems = regularStock.items.map((stock) => {
      const orderItem = items[stock.productId.toString()];
      if (!orderItem) return stock;

      const stockCopy = { ...stock.toObject() };

      if (!Array.isArray(orderItem)) {
        // Handle regular products
        if (stockCopy.consumedQuantity && orderItem.quantity > 0) {
          stockCopy.consumedQuantity = Math.max(0, stockCopy.consumedQuantity - orderItem.quantity);
          isModified = true;
        }
      } else {
        // Handle plates
        orderItem.forEach((plate) => {
          if (plate.plateType === 'full' || 
              plate.name.toLowerCase().includes('full') || 
              plate.name.toLowerCase().includes('double')) {
            if (stockCopy.fullPlateConsumedQuantity > 0) {
              stockCopy.fullPlateConsumedQuantity = Math.max(0, stockCopy.fullPlateConsumedQuantity - plate.quantity);
              isModified = true;
            }
          } else {
            if (stockCopy.halfPlateConsumedQuantity > 0) {
              stockCopy.halfPlateConsumedQuantity = Math.max(0, stockCopy.halfPlateConsumedQuantity - plate.quantity);
              isModified = true;
            }
          }
        });
      }
      return stockCopy;
    });

    if (isModified) {
      await RegularStock.findOneAndUpdate(
        { _id: regularStock._id },
        { $set: { items: updatedItems } },
        { new: true, session }
      );
    }
  });

  await Promise.all(revertPromises);

  // Revert stockable product changes
  const stockableRevertPromises = Object.values(items)
    .filter((item) => !Array.isArray(item) && item?.isStockAble && item.quantity > 0)
    .map(async (item) => {
      const productId = item.productId?._id || item.productId;
      await Product.findByIdAndUpdate(
        productId, 
        { $inc: { stock: item.quantity } }, 
        { session }
      );
    });

  await Promise.all(stockableRevertPromises);
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
  sortOptions.createdAt = -1;

  // Execute query with pagination
  const [orders, totalOrders] = await Promise.all([
    Order.find(filtered).populate('customerId', 'name').sort(sortOptions).skip(skip).limit(limit).lean(),
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
  return Order.findOne({ _id: id })
    .populate({
      path: 'items.productId',
      model: 'Product',
      select: 'name price images categoryId dealProducts',
    })
    .populate({
      path: 'userId',
      select: 'name email',
    })
    .lean();
};

/**
 * Get order by orderId
 * @param {String} id
 * @returns {Promise<Order>}
 */
const getOrderByOrderId = async (id) => {
  return Order.findOne({ orderId: id }).lean();
};

const calculateZeroQuantityItemPrice = async () => {
  const today = new Date().toISOString().split('T')[0];
  const orders = await Order.find({
    createdAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59.999Z') },
    'items.quantity': 0,
  });

  const total = orders.reduce((acc, order) => {
    const zeroQuantityItems = order.items.filter((item) => item.quantity === 0);
    return acc + zeroQuantityItems.reduce((itemAcc, item) => itemAcc + item.price, 0);
  }, 0);

  return total;
};

const calculateTodayTotalCountOrders = async () => {
  const today = new Date().toISOString().split('T')[0];
  const count = await Order.countDocuments({
    createdAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59.999Z') },
  });

  return count;
};

const calculateTotalRevenue = async () => {
  const today = new Date().toISOString().split('T')[0];
  const revenue = await Order.aggregate([
    { $match: {paymentStatus: 'paid', createdAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59.999Z') } } },
    { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
  ]);

  const totalRevenue = revenue[0]?.revenue || 0;
  return totalRevenue;
};

/**
 * Get order analytics including product quantities sold between dates
 * @param {Object} params - Filter params
 * @returns {Promise<Object>} Analytics data
 */
const getOrderAnalytics = async (params) => {
  try {
    const {startDate, endDate } = params;

    const start = startDate ? new Date(startDate) : new Date().setHours(0, 0, 0, 0);
    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : new Date();
    
    const matchCondition = {
      createdAt: { $gte: start, $lte: end },
      paymentStatus: 'paid'
    };
    
    const orderSummary = await Order.aggregate([
      { $match: matchCondition },
      { 
        $group: { 
          _id: null, 
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          customerTypes: { $addToSet: '$customerType' }
        } 
      }
    ]);
    
    const productSales = await Order.aggregate([
      { $match: matchCondition },
      { $unwind: '$items' },
      { 
        $group: { 
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { 
            $sum: { 
              $cond: { 
                if: { $gt: ['$items.quantity', 0] }, 
                then: { $multiply: ['$items.price', '$items.quantity'] }, 
                else: '$items.price' 
              }
            } 
          },
          orderCount: { $sum: 1 },
          prices: { $push: '$items.price' }
        } 
      },
      { 
        $addFields: {
          price: { $arrayElemAt: ['$prices', 0] }
        }
      },
      { 
        $project: {
          _id: 0,
          name: '$_id',
          price: 1,
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1
        } 
      },
      { $sort: { totalQuantity: -1 } }
    ]);
    
    return {
      period: {
        from: start,
        to: end
      },
      summary: {
        totalOrders: orderSummary[0]?.totalOrders || 0,
        totalRevenue: orderSummary[0]?.totalRevenue || 0,
      },
      productSales: productSales,
    };
  } catch (error) {
    console.error('Error generating order analytics:', error);
    throw new Error('Failed to generate order analytics');
  }
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
  getOrderByOrderId,
  getOrderAnalytics
};