const httpStatus = require('http-status');
const { PaymentCard } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a payment card
 * @param {Object} cardBody
 * @param {string} userId
 * @returns {Promise<PaymentCard>}
 */
const createCard = async (cardBody, userId) => {
  // If this is the first card or isDefault is true, handle default card logic
  if (cardBody.isDefault) {
    await PaymentCard.updateMany({ userId }, { isDefault: false });
  }
  console.log("cardBody ====>>>",cardBody);
  
  return PaymentCard.create({ ...cardBody, userId });
};

/**
 * Query for cards
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryCards = async (filter, options) => {
  const cards = await PaymentCard.find()
  return cards;
};

/**
 * Get card by id
 * @param {ObjectId} id
 * @returns {Promise<PaymentCard>}
 */
const getCardById = async (id) => {
  return PaymentCard.findById(id);
};

/**
 * Update card by id
 * @param {ObjectId} cardId
 * @param {Object} updateBody
 * @returns {Promise<PaymentCard>}
 */
const updateCardById = async (cardId, updateBody) => {
  const card = await getCardById(cardId);
  if (!card) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Card not found');
  }

  // If updating default status to true, remove default status from other cards
  if (updateBody.isDefault) {
    await PaymentCard.updateMany({ userId: card.userId }, { isDefault: false });
  }

  Object.assign(card, updateBody);
  await card.save();
  return card;
};

/**
 * Delete card by id
 * @param {ObjectId} cardId
 * @returns {Promise<PaymentCard>}
 */
const deleteCardById = async (cardId) => {
  const card = await getCardById(cardId);
  if (!card) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Card not found');
  }
  await card.remove();
  return card;
};

module.exports = {
  createCard,
  queryCards,
  getCardById,
  updateCardById,
  deleteCardById,
};