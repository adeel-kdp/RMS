const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    autoIndex: true, // Ensure indexes are created
  }
);

const Shop = mongoose.model('Shop', shopSchema);

module.exports = Shop;
