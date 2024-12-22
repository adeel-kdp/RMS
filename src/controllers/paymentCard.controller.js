const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { paymentCardService } = require('../services');
const pick = require('../utils/pick');

const createCard = catchAsync(async (req, res) => {
  const card = await paymentCardService.createCard(req.body, req.user);
  res.status(httpStatus.CREATED).send(card);
});

const getCards = catchAsync(async (req, res) => {
  const filter = { userId: req.user };
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await paymentCardService.queryCards(filter, options);
  res.send(result);
});

const getCard = catchAsync(async (req, res) => {
  const card = await paymentCardService.getCardById(req.params.cardId);
  if (!card) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Card not found');
  }
  if (card.userId.toString() !== req.user) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  res.send(card);
});

const updateCard = catchAsync(async (req, res) => {
  const card = await paymentCardService.getCardById(req.params.cardId);
  if (card.userId.toString() !== req.user) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  const updatedCard = await paymentCardService.updateCardById(req.params.cardId, req.body);
  res.send(updatedCard);
});

const deleteCard = catchAsync(async (req, res) => {
  const card = await paymentCardService.getCardById(req.params.cardId);
  if (card.userId.toString() !== req.user) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  await paymentCardService.deleteCardById(req.params.cardId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createCard,
  getCards,
  getCard,
  updateCard,
  deleteCard,
};