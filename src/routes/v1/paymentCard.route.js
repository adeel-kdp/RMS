const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const paymentCardValidation = require('../../validations/paymentCard.validation');
const paymentCardController = require('../../controllers/paymentCard.controller');

const router = express.Router();

router
  .route('/')
  .post(auth.verifyToken(), validate(paymentCardValidation.createCard), paymentCardController.createCard)
  .get(auth.verifyToken(), paymentCardController.getCards);

router
  .route('/:cardId')
  .get(auth.verifyToken(), validate(paymentCardValidation.getCard), paymentCardController.getCard)
  .put(auth.verifyToken(), validate(paymentCardValidation.updateCard), paymentCardController.updateCard)
  .delete(auth.verifyToken(), validate(paymentCardValidation.deleteCard), paymentCardController.deleteCard);

module.exports = router;