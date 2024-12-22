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
    category: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Category',
      required: true,
    },
    subCategory: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
    },
    manufacturingCost: {
      type: Number,
      required: true,
      min: 0,
    },
    keywords: {
      newArrival: {
        type: Boolean,
        default: false,
      },
      bestSeller: {
        type: Boolean,
        default: false,
      },
      discounted: {
        type: Boolean,
        default: false,
      },
      custom: [String],
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
    productType: {
      type: String,
      required: false,
      enum: ['Digital Products', '3d Characters', '2D Characters'],
    },
    isPopular: {
      type: Boolean,
      default: false,
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
