const httpStatus = require('http-status');
const Category = require('../models/category.model');
const ApiError = require('../utils/ApiError');
const Product = require('../models/product.model');
const { uploadImage, deleteImage } = require('./cloudinary.service');
/**
 * Create a category
 * @param {Object} categoryBody
 * @returns {Promise<Category>}
 */
const createCategory = async (categoryBody) => {
  const category = await Category.findOne({ name: categoryBody.name });
  if (category) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category already exists');
  }

  let imageUrl = '';
  let imagePublicId = '';
  if (categoryBody.image) {
    const image = await uploadImage(categoryBody.image, 'category');

    imageUrl = image.url;
    imagePublicId = image.public_id;
  }

  return Category.create({ ...categoryBody, imageUrl, imagePublicId });
};

/**
 * Query for categories with pagination
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
const queryCategories = async (filter, options) => {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;

  // Remove empty name filter
  if (filter.name === '') {
    delete filter.name;
  }

  // Prepare sort options
  let sortOptions = {};
  if (options.sortBy) {
    // Handle simple sortBy format (e.g., "name")
    if (!options.sortBy.includes(':')) {
      sortOptions[options.sortBy] = 1; // Default to ascending
    } else {
      // Handle detailed sortBy format (e.g., "name:desc")
      const [key, order] = options.sortBy.split(':');
      sortOptions[key] = order === 'desc' ? -1 : 1;
    }
  }

  // If filter.name exists, create case-insensitive regex
  if (filter.name) {
    filter.name = new RegExp(filter.name, 'i');
  }
  filter.isActive = true;
  // Execute query with pagination
  const [categories, totalCategories] = await Promise.all([
    Category.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(), // Add lean() for better performance
    Category.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCategories / limit);

  return {
    results: categories,
    page,
    limit,
    totalPages,
    totalResults: totalCategories,
  };
};

/**
 * Get all categories
 * @returns {Promise<Category[]>}
 */
const getAllCategories = async () => {
  return Category.find({isActive: true}).lean();
};

/**
 * Update category by id
 * @param {ObjectId} categoryId
 * @param {Object} updateBody
 * @returns {Promise<Category>}
 */
const updateCategoryById = async (categoryId, updateBody) => {
  // Check if category exists
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  // Check if new name already exists (if name is being updated)
  if (updateBody.name && updateBody.name !== category.name) {
    const nameExists = await Category.findOne({ name: updateBody.name, _id: { $ne: categoryId } });
    if (nameExists) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Category name already taken');
    }
  }

  // Handle image update
  let imageUrl = category.imageUrl;
  let imagePublicId = category.imagePublicId;

  if (updateBody.image) {
    // Check if the image is a base64 string
    const isBase64 = updateBody.image.includes('base64');

    if (isBase64) {
      // Delete old image from cloudinary if it exists
      if (category.imagePublicId) {
        try {
          await deleteImage(category.imagePublicId);
        } catch (error) {
          console.error('Error deleting old image:', error);
          // Continue with the update even if deletion fails
        }
      }

      // Upload new image
      const image = await uploadImage(updateBody.image, 'category');
      imageUrl = image.url;
      imagePublicId = image.public_id;
    } else {
      // If not base64, assume it's the existing URL, keep the current values
      imageUrl = category.imageUrl;
      imagePublicId = category.imagePublicId;
    }
  }

  // Remove image from updateBody to prevent direct updates
  delete updateBody.image;

  // Update category with new values
  const updatedCategory = await Category.findByIdAndUpdate(
    categoryId,
    {
      ...updateBody,
      imageUrl,
      imagePublicId,
    },
    {
      new: true, // Return the updated document
      runValidators: true, // Run schema validators
    }
  );

  return updatedCategory;
};

/**
 * Delete category by id
 * @param {ObjectId} categoryId
 * @returns {Promise<Category>}
 */
const deleteCategoryById = async (categoryId) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  // Check if any products are using this category
  const productsExist = await Product.exists({ category: categoryId });
  if (productsExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete category because it has associated products');
  }

  await Category.findByIdAndUpdate(
    categoryId,
    {
      isActive: false,
    },
    {
      new: true,
    }
  );
  return category;
};

/**
 * Get category by id
 * @param {ObjectId} id
 * @returns {Promise<Category>}
 */
const getCategoryById = async (id) => {
  return Category.findById(id);
};

module.exports = {
  createCategory,
  updateCategoryById,
  deleteCategoryById,
  getCategoryById,
  queryCategories,
  getAllCategories,
};
