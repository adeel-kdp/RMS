const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { productService } = require('../services');
const pick = require('../utils/pick');

const createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(httpStatus.CREATED).send(product);
});

const getAllProducts = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    'name',
    'category',
    'subCategory',
    'price',
    'keywords',
    'productType',
    'isActive',
  ]);
  const result = await productService.queryProductsByFilter(filter);
  res.send(result);
});

const getProductsWithPagination = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    'name',
    'categoryId',
    'quantity',
    'price',
    'shopId',
    'images',
    'isActive',
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

const updateProduct = catchAsync(async (req, res) => {
  const product = await productService.updateProductById(req.params.productId, req.body);
  res.send(product);
});

const deleteProduct = catchAsync(async (req, res) => {
  await productService.deleteProductById(req.params.productId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createProduct,
  getAllProducts,
  getProductsWithPagination,
  getProduct,
  updateProduct,
  deleteProduct,
};
