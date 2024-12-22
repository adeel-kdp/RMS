const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const favouriteItemValidation = require('../../validations/favouriteItem.validation');
const favouriteItemController = require('../../controllers/favouriteItem.controller');

const router = express.Router();

router
  .route('/')
  .post(auth.verifyToken(), validate(favouriteItemValidation.createFavouriteItem), favouriteItemController.createFavouriteItem)
  .get(auth.verifyToken(), favouriteItemController.getFavouriteItems);

router
  .route('/getByProductId/:id')
  .get(auth.verifyToken(), validate(favouriteItemValidation.getFavouriteItem), favouriteItemController.getFavouriteItemByProductId)

  router
  .route('/:id')
  .get(auth.verifyToken(), validate(favouriteItemValidation.getFavouriteItem), favouriteItemController.getFavouriteItem)
  .delete(auth.verifyToken(), validate(favouriteItemValidation.deleteFavouriteItem), favouriteItemController.deleteFavouriteItem);

module.exports = router;
