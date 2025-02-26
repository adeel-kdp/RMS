const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { productService } = require('../services');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');

const createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(httpStatus.CREATED).send(product);
});

const getAllProducts = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    'name',
    'categoryId',
    'shopId',
    'price',
    'parentProduct',
    'isStockAble',
    'isShowcase',
    'isActive',
  ]);
  const result = await productService.queryProductsByFilter(filter);
  res.send(result);
});

// req.query.haveParents = true
// if true the return the products that have products in parents 
// if false return the products that don't have products in parents
// if undefined or null return all products

// this is part of the modal of product about parentProduct
//     parentProduct: {
//       type: mongoose.SchemaTypes.ObjectId,
//       ref: 'Product',
//       required: false,
//     },
//     please use Product.aggregate

const getProductsWithPagination = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    'name',
    'categoryId',
    'quantity',
    'price',
    'shopId',
    'images',
    'isActive',
    'isStockAble',
  ]);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Convert string values to appropriate types
  if (options.limit) options.limit = parseInt(options.limit);
  if (options.page) options.page = parseInt(options.page);
  const result = await productService.queryProducts(filter, options);

  res.send(result);
});

const getProduct = catchAsync(async (req, res) => {
  const product = await productService.getProductById(req.params.productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  res.send(product);
});
const getProductsCategorizedByCategory = catchAsync(async (req, res) => {
  const products = await productService.getProductsCategorizedByCategory();
  if (!products) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  res.send(products);
});

const updateProduct = catchAsync(async (req, res) => {
  const product = await productService.updateProductById(req.params.productId, req.body);
  res.send(product);
});

const deleteProduct = catchAsync(async (req, res) => {
  await productService.deleteProductById(req.params.productId);
  res.status(httpStatus.NO_CONTENT).send();
});

const saveProductsRates = catchAsync(async (req, res) => {
  const product = await productService.saveProductsRates(req.body.products);
  res.send(product);
});

module.exports = {
  createProduct,
  getAllProducts,
  getProductsWithPagination,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductsCategorizedByCategory,
  saveProductsRates,
};
