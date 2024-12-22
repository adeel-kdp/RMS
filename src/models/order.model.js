const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const { required } = require('joi');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  orderQuantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
});

const orderSchema = mongoose.Schema(
  {
    orderId: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toHexString(),
    },
    // user Id
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    totalItems: {
      type: Number,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ['completed', 'cancelled'],
      default: 'pending',
      required: true,
    },
    orderDate: {
      type: Date,
      required: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
orderSchema.plugin(toJSON);
orderSchema.plugin(paginate);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;

