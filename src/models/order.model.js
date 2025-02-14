const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: false,
  },
  isStockAble: {
    type: Boolean,
    required: true,
  },
  parentProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false,
  },
  plateType: {
    type: String,
    enum: ['full', 'half'],
    required: false,
  },
  // dealProducts: [{
  //   type: orderItemSchema,
  //   required: false,
  // }],
});

const orderSchema = mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: false,
    },
    customerContactNo: {
      type: String,
      required: false,
    },
    customerType: {
      type: String,
      enum: ['eatIn', 'takeAway', 'delivery'],
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', "cancelled"],
      default: 'paid',
      required: false,
    },
    items: [orderItemSchema],
    shippingAddress: {
      type: String,
      required: false,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
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

