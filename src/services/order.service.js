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
  const regularStocksData = await RegularStock.find({
    userId,
    shopId: orderBody.shopId,
    createdAt: {
      $gte: new Date(today).setHours(0, 0, 0, 0),
      $lt: new Date(today).setHours(23, 59, 59, 999),
    },
  }).sort({ createdAt: 1 });

  if (!regularStocksData.length) {
    throw new Error('No Stocks Found For Today');
  }
  const regularStocks = regularStocksData.map(stock => stock.toObject());
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
  console.log('items ====>>>', items);

  // Process regular stocks
  // await Promise.all(
  //   regularStocks.map(async (regularStock) => {
  //     let isModified = false;
  //     const updatedItems = regularStock.items.map((stock) => {
  //       const orderItem = items[stock.productId];
  //       if (!orderItem) return stock;

  //       const stockCopy = { ...stock };
  //       if (orderItem?.remainingQuantity > 0 && !orderItem?.parentProduct) {
  //         // Handle regular products
  //         const availableQuantity = stock.quantity - (stock.consumedQuantity || 0);
  //         const quantityToConsume = Math.min(orderItem.remainingQuantity, availableQuantity);

  //         if (quantityToConsume > 0) {
  //           stock.consumedQuantity = (stock.consumedQuantity || 0) + quantityToConsume;
  //           orderItem.remainingQuantity -= quantityToConsume;
  //           isModified = true;
  //         }
  //         if (availableQuantity <= 12) refresh = true;
  //       } else if (orderItem.length > 0 && stock.isAvailable) {
  //         // Handle plates
  //         for (let i = 0; i < orderItem.length; i++) {
  //           const element = orderItem[i];

  //           if (element?.parentProduct && element?.remainingQuantity > 0) {
  //             console.log('element', element);

  //             // Handle products with parent products (plates)
  //             if (element.plateType === 'full') {
  //               stock.fullPlateConsumedQuantity = (stock.fullPlateConsumedQuantity || 0) + element.remainingQuantity;
  //             } else if (element.plateType === 'half') {
  //               stock.halfPlateConsumedQuantity = (stock.halfPlateConsumedQuantity || 0) + element.remainingQuantity;
  //             }
  //             orderItem[i].remainingQuantity = 0;
  //             isModified = true;
  //           }
  //         }
  //       }
  //       return stock;
  //     });
  //     // Only save if modifications were made
  //     if (isModified) {
  //       await RegularStock.findOneAndUpdate(
  //         { _id: regularStock._id },
  //         { $set: { items: updatedItems } },
  //         { new: true, session }
  //       );
  //     }
  //   })
  // );

  for (let i = 0; i < regularStocks.length; i++) {
    const regularStock = regularStocks[i];

    let isModified = false;

    const updatedItems = [];
    // regularStock.items.map((stock) =>
    for (let j = 0; j < regularStock.items.length; j++) {
      const stock = regularStock.items[j];
      const orderItem = items[stock.productId];
      if (!orderItem) {
        updatedItems.push(stock);
        continue;
      }

      if (orderItem?.remainingQuantity > 0 && !orderItem?.parentProduct) {
        // Handle regular products
        const availableQuantity = stock.quantity - (stock.consumedQuantity || 0);
        const quantityToConsume = Math.min(orderItem.remainingQuantity, availableQuantity);

        if (quantityToConsume > 0) {
          stock.consumedQuantity = (stock.consumedQuantity || 0) + quantityToConsume;
          orderItem.remainingQuantity -= quantityToConsume;
          isModified = true;
        }
        if (availableQuantity <= 12) refresh = true;
      } else if (orderItem.length > 0 && stock.isAvailable) {
        // Handle plates
        for (let i = 0; i < orderItem.length; i++) {
          const element = orderItem[i];

          if (element?.parentProduct && element?.remainingQuantity > 0) {
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
      updatedItems.push(stock);
    }
    // Only save if modifications were made
    console.log('updatedItems', updatedItems);
    
    if (isModified) {
      await RegularStock.findOneAndUpdate(
        { _id: regularStock._id },
        { $set: { items: updatedItems } },
        { new: true, session }
      );
    }
  }

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
  const orderBodyWithDate = orderBody.orderDate
    ? { ...orderBody, createdAt: new Date(orderBody.orderDate), updatedAt: new Date(orderBody.orderDate) }
    : orderBody;

  delete orderBodyWithDate.orderDate;
  const [order] = await Order.create([{ ...orderBodyWithDate, userId }], { session });
  console.log('orderBodyWithDate', orderBodyWithDate);
  console.log('order', order);
  order.refresh = refresh;
  return refresh;
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
  // if (options.sortBy) {
  //   // Handle simple sortBy format (e.g., "name")
  //   if (!options.sortBy.includes(':')) {
  //     sortOptions[options.sortBy] = 1; // Default to ascending
  //   } else {
  //     // Handle detailed sortBy format (e.g., "name:desc")
  //     const [key, order] = options.sortBy.split(':');
  //     sortOptions[key] = order === 'desc' ? -1 : 1;
  //   }
  // }
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
  return Order.findOne({ _id: id })
    .populate({
      path: 'items.productId',
      model: 'Product',
      select: 'name price images categoryId dealProducts', // Select specific fields
    })
    .populate({
      path: 'userId',
      select: 'name email', // Add more fields if needed
    })
    .lean();
};
/**
 * Get order by id
 * @param {ObjectId} id
 * @returns {Promise<Order>}
 */
const getOrderByOrderId = async (id) => {
  return Order.findOne({ orderId: id }).lean();
};

/**
 * Update an order
 * @param {string} orderId
 * @param {Object} updateBody
 * @returns {Promise<Order>}
 */
const updateOrderById = async (userId, orderId, updateBody, session) => {
  // First get the existing order - INCLUDE SESSION IN QUERY
  const existingOrder = await getOrderById(orderId);

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
    for (let i = 0; i < existingOrder.items.length; i++) {
      const item = existingOrder.items[i];
      if (item?.productId?.dealProducts?.length) {
        const a = updateBody.items.findIndex((updateItem) => updateItem.name == item.name);
        if (a !== -1) {
          updateBody.items[a].dealProducts = item.productId.dealProducts;
        }
      }
    }
    // Then process new quantities like in create order
    const today = new Date().toISOString().split('T')[0];
    // INCLUDE SESSION IN QUERY
    const regularStocks = await RegularStock.find(
      {
        userId,
        shopId: existingOrder.shopId,
        createdAt: {
          $gte: new Date(today).setHours(0, 0, 0, 0),
          $lt: new Date(today).setHours(23, 59, 59, 999),
        },
      },
      null,
      { session }
    ).sort({ createdAt: 1 });

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
                if (
                  element.name.includes('Full') ||
                  element.name.includes('full') ||
                  element.name.includes('Double') ||
                  element.name.includes('double')
                ) {
                  stock.fullPlateConsumedQuantity = (stock.fullPlateConsumedQuantity || 0) + element.remainingQuantity;
                } else {
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

  // Update the order and include session
  const updatedOrder = await Order.findByIdAndUpdate(orderId, updateBody, { new: true, session });

  return updatedOrder;
};

/**
 * Cancel an order
 * @param {string} orderId
 * @returns {Promise<Order>}
 */
const cancelOrderById = async (userId, orderId, session) => {
  // const order = await Order.findOne({ _id: orderId });
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
 * @returns {Promise<void>}
 */
const revertStockChanges = async (order, session) => {
  const today = new Date(order.createdAt).toISOString().split('T')[0];

  // Get regular stocks for the order date
  const regularStocks = await RegularStock.find(
    {
      userId: order.userId,
      shopId: order.shopId,
      createdAt: {
        $gte: new Date(today).setHours(0, 0, 0, 0),
        $lt: new Date(today).setHours(23, 59, 59, 999),
      },
    },
    null,
    { session }
  );

  // Create a map of items to revert
  const items = order.items.reduce((acc, item) => {
    const key = item?.parentProduct || item.productId._id;
    if (!acc[key]) {
      acc[key] = item?.parentProduct ? [] : { ...item, quantity: 0 };
    }
    if (item?.parentProduct) {
      acc[key].push(item);
    } else {
      acc[key].quantity += item.quantity;
    }
    if (item?.productId?.dealProducts?.length) {
      item.productId.dealProducts.forEach((product) => {
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

        if (!Array.isArray(orderItem)) {
          if (stock.consumedQuantity) {
            stock.consumedQuantity = Math.max(0, stock.consumedQuantity - orderItem.quantity);
            isModified = true;
          }
        } else if (Array.isArray(orderItem)) {
          orderItem.forEach((plate) => {
            if (
              (plate.name.includes('Full') ||
                plate.name.includes('full') ||
                plate.name.includes('Double') ||
                plate.name.includes('double')) &&
              stock.fullPlateConsumedQuantity
            ) {
              stock.fullPlateConsumedQuantity = Math.max(0, stock.fullPlateConsumedQuantity - plate.quantity);
              isModified = true;
            } else if (stock.halfPlateConsumedQuantity) {
              stock.halfPlateConsumedQuantity = Math.max(0, stock.halfPlateConsumedQuantity - plate.quantity);
              isModified = true;
            }
          });
        }
        return stock;
      });

      if (isModified) {
        await RegularStock.findOneAndUpdate(
          { _id: regularStock.id },
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
  const orders = await Order.find({
    createdAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59.999Z') },
    'items.quantity': 0,
  });

  const total = orders.reduce((acc, order) => {
    const zeroQuantityItems = order.items.filter((item) => item.quantity === 0);
    return acc + zeroQuantityItems.reduce((itemAcc, item) => itemAcc + item.price, 0);
  }, 0);

  console.log(`Total price of items with 0 quantity: ${total}`);

  return total;
};

const calculateTodayTotalCountOrders = async () => {
  const today = new Date().toISOString().split('T')[0];
  const count = await Order.countDocuments({
    createdAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59.999Z') },
  });

  console.log(`Total count of orders for today: ${count}`);

  return count;
};

const calculateTotalRevenue = async () => {
  const today = new Date().toISOString().split('T')[0];
  const revenue = await Order.aggregate([
    { $match: { paymentStatus: 'paid', createdAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59.999Z') } } },
    { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
  ]);

  const totalRevenue = revenue[0]?.revenue || 0;
  console.log(`Total revenue for today: ${totalRevenue}`);
  return totalRevenue;
};

/**
 * Get order analytics including product quantities sold between dates
 * @param {Object} params - Filter params
 * @param {Date|string} params.fromDate - Start date for analytics
 * @param {Date|string} params.toDate - End date for analytics
 * @param {mongoose.ObjectId|string} [params.shopId] - Optional shop ID to filter by
 * @returns {Promise<Object>} Analytics data
 */
const getOrderAnalytics = async (params) => {
  try {
    // Validate and process date inputs
    const { startDate, endDate } = params;

    const start = startDate ? new Date(startDate) : new Date().setHours(0, 0, 0, 0); // Default to today date if not provided
    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : new Date(); // Default to current date if not provided

    // Base match condition
    const matchCondition = {
      createdAt: { $gte: start, $lte: end },
      paymentStatus: 'paid', // Only include paid orders
    };

    // // Add shopId to match condition if provided
    // if (options.shopId) {
    //   matchCondition.shopId = mongoose.Types.ObjectId.isValid(options.shopId)
    //     ? new mongoose.Types.ObjectId(options.shopId)
    //     : options.shopId;
    // }

    // Get total orders and revenue
    const orderSummary = await Order.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          customerTypes: { $addToSet: '$customerType' },
        },
      },
    ]);

    // // Get order counts by customer type
    // const ordersByCustomerType = await Order.aggregate([
    //   { $match: matchCondition },
    //   {
    //     $group: {
    //       _id: '$customerType',
    //       count: { $sum: 1 },
    //       revenue: { $sum: '$totalAmount' }
    //     }
    //   },
    //   { $sort: { count: -1 } }
    // ]);

    // Get product sales data - quantities and revenue
    const productSales = await Order.aggregate([
      { $match: matchCondition },
      { $unwind: '$items' }, // Unwind items array
      {
        $group: {
          _id: '$items.name', // Group by product name only
          totalQuantity: { $sum: '$items.quantity' }, // Sum of quantity sold
          // totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, // Total revenue
          totalRevenue: {
            $sum: {
              $cond: {
                if: { $gt: ['$items.quantity', 0] },
                then: { $multiply: ['$items.price', '$items.quantity'] },
                else: '$items.price',
              },
            },
          },
          orderCount: { $sum: 1 }, // Number of orders
          prices: { $push: '$items.price' }, // Collect all prices
        },
      },
      {
        $addFields: {
          price: { $arrayElemAt: ['$prices', 0] }, // Pick the first price from the list (adjust if needed)
        },
      },
      {
        $project: {
          _id: 0,
          name: '$_id', // Extract name
          price: 1, // Show selected price
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1,
        },
      },
      { $sort: { totalQuantity: -1 } }, // Sort by total quantity sold in descending order
    ]);

    return {
      period: {
        from: start,
        to: end,
      },
      summary: {
        totalOrders: orderSummary[0]?.totalOrders || 0,
        totalRevenue: orderSummary[0]?.totalRevenue || 0,
        // avgOrderValue: orderSummary[0]?.avgOrderValue || 0
      },
      // customerTypeBreakdown: ordersByCustomerType,
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
  getOrderAnalytics,
};
