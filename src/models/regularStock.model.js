const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const regularStockSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    shopId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Shop',
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.SchemaTypes.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        consumedQuantity: {
          type: Number,
        },
        halfPlateConsumedQuantity: {
          type: Number,
        },
        fullPlateConsumedQuantity: {
          type: Number,
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
      },
    ],
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

regularStockSchema.plugin(toJSON);
regularStockSchema.plugin(paginate);

const RegularStock = mongoose.model('RegularStock', regularStockSchema);

module.exports = RegularStock;
