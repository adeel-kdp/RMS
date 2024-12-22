const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const productValidation = require('../../validations/product.validation');
const productController = require('../../controllers/product.controller');

const router = express.Router();

router
  .route('/')
  .post(auth.verifyToken(), validate(productValidation.createProduct), productController.createProduct)
  .get(productController.getProductsWithPagination);

router.route('/allProducts').get(productController.getAllProducts);

router
  .route('/:productId')
  .get( validate(productValidation.getProduct), productController.getProduct)
  .put(auth.verifyToken(), validate(productValidation.updateProduct), productController.updateProduct)
  .delete(auth.verifyToken(), validate(productValidation.deleteProduct), productController.deleteProduct);

module.exports = router;
