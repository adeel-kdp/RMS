const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      type: String,
      required: true,
    },
    contactNo: {
      type: String,
      required: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    autoIndex: true, // Ensure indexes are created
  }
);

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;

