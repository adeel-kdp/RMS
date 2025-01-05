const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  purchaseQuantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
  },
  dealProducts: {
    type: mongoose.Schema.Types.Mixed,
  },
  isStockAble: {
    type: Boolean,
    required: true,
  },
  isParentProduct: {
    type: Boolean,
    default: false,
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
  },
});

const orderSchema = mongoose.Schema(
  {
    orderId: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toHexString(),
    },
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
      enum: ['completed', 'cancelled', 'pending'],
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

orderSchema.plugin(toJSON);
orderSchema.plugin(paginate);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;

