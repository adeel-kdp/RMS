const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const { required } = require('joi');

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Category',
      required: true,
    },
    shopId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Shop',
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true, 
    },
    plateType: {
      type: String,
      enum: ['full', 'half'],
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
    },
    images: [{
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          trim: true,
          required: false,
        },
      },
    ],
    parentProduct: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Product',
      required: false,
    },
    dealProducts: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      quantity: {
        type: Number,
      },
    }],
    formula: {
      type: String,
      trim: true,
      required: false,
      default: "*1",
    },
    mundiRate: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },
    isStockAble: {
      type: Boolean,
      default: true,
    },
    isShowcase: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
productSchema.plugin(toJSON);
productSchema.plugin(paginate);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
