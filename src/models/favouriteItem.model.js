const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const favouriteItemSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
favouriteItemSchema.plugin(toJSON);
favouriteItemSchema.plugin(paginate);



const FavouriteItem = mongoose.model('FavouriteItem', favouriteItemSchema);

module.exports = FavouriteItem;