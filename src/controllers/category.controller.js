const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const categoryService = require('../services/category.service');

const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  res.status(httpStatus.CREATED).send(category);
});

const getCategoriesWithPagination = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'isActive']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  // Convert string values to appropriate types
  if (options.limit) options.limit = parseInt(options.limit);
  if (options.page) options.page = parseInt(options.page);
  
  const result = await categoryService.queryCategories(filter, options);
  res.send(result);
});

const getAllCategories = catchAsync(async (req, res) => {
  const categories = await categoryService.getAllCategories();
  res.send(categories);
});

const getCategory = catchAsync(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }
  res.send(category);
});

const updateCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategoryById(req.params.categoryId, req.body);
  res.send(category);
}); 

const deleteCategory = catchAsync(async (req, res) => {
  await categoryService.deleteCategoryById(req.params.categoryId);
  res.status(httpStatus.NO_CONTENT).send();
});

// const createSubCategory = catchAsync(async (req, res) => {
//   const category = await categoryService.addSubCategory(req.params.categoryId, req.body);
//   res.status(httpStatus.CREATED).send(category);
// });

// const updateSubCategory = catchAsync(async (req, res) => {
//   const category = await categoryService.updateSubCategory(
//     req.params.categoryId,
//     req.params.subCategoryId,
//     req.body
//   );
//   res.send(category);
// });

// const deleteSubCategory = catchAsync(async (req, res) => {
//   const category = await categoryService.deleteSubCategory(
//     req.params.categoryId,
//     req.params.subCategoryId
//   );
//   res.send(category);
// });

module.exports = {
  createCategory,
  getCategoriesWithPagination,
  getCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
};


