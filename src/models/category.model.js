const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subCategories: {
      type: [String],
      default: function() { return []; }
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    imagePublicId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    autoIndex: true, // Ensure indexes are created
  }
);

// Explicitly remove any problematic indexes
categorySchema.set('autoIndex', true);

// Remove the problematic unique index
categorySchema.index({ subCategories: 1 }, { unique: false, sparse: true });

// Pre-save middleware to ensure subCategories is always an array
categorySchema.pre('save', function(next) {
  if (this.subCategories === undefined) {
    this.subCategories = [];
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);

// Utility function to drop existing indexes (run this once)
async function dropExistingIndexes() {
  try {
    await Category.collection.dropIndexes();
    console.log('All indexes dropped');
  } catch (error) {
    console.error('Error dropping indexes:', error);
  }
}

// Uncomment and run this once to reset indexes
// dropExistingIndexes();

module.exports = Category;