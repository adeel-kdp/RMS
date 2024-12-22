const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const paymentCardSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    cardholderName: {
      type: String,
      required: true,
      trim: true,
    },
    cardNumber: {
      type: String,
      required: true,
      trim: true,
      private: false, // used by the toJSON plugin
    },
    expiryMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    expiryYear: {
      type: Number,
      required: true,
      min: new Date().getFullYear(),
    },
    cvv: {
      type: String,
      required: true,
      private: false,
    },
    cardType: {
      type: String,
      enum: ['Visa', 'Mastercard', 'PayPal', 'Bitcoin', 'Amazon', 'Klarna', 'Pioneer', 'Ethereum'],
      required: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
paymentCardSchema.plugin(toJSON);
paymentCardSchema.plugin(paginate);

// Encrypt sensitive data before saving
paymentCardSchema.pre('save', async function (next) {
  const card = this;
  if (card.isModified('cardNumber')) {
    // In a real application, you would encrypt these fields
    card.cardNumber = card.cardNumber.slice(-4).padStart(16, '*');
  }
  next();
});

const PaymentCard = mongoose.model('PaymentCard', paymentCardSchema);

module.exports = PaymentCard;