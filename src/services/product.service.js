const httpStatus = require('http-status');
const Product = require('../models/product.model');
const ApiError = require('../utils/ApiError');

/**
 * Create a product
 * @param {Object} productBody
 * @returns {Promise<Product>}
 */
const createProduct = async (productBody) => {
  const product = await Product.findOne({ name: productBody.name });
  if (product) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Product name already exists');
  }

  const images = [];
  if (productBody.images) {
    for (const image of productBody.images) {
   
      const public_id = image.image.split("/").pop().split(".")[0];

      images.push({
        url: image.image,
        publicId: "product/" + public_id,
      });
    }
  }

  return Product.create({ ...productBody, images });
};

/**
 * Query for products
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryProducts = async (filter, options) => {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;

  const filtered = {};
  Object.keys(filter).forEach((key) => {
    if (filter[key] !== '') {
      filtered[key] = filter[key];
    }
  });

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
  if (filtered.name) {
    filtered.name = new RegExp(filtered.name, 'i');
  }
  filtered.isActive = true;

  // Execute query with pagination
  const [products, totalProducts] = await Promise.all([
    Product.find(filtered)
      .populate('categoryId', 'name') // Populate category name
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(), // Add lean() for better performance
    Product.countDocuments(filtered),
  ]);

  const totalPages = Math.ceil(totalProducts / limit);

  return {
    results: products,
    page,
    limit,
    totalPages,
    totalResults: totalProducts,
  };
};

/**
 * Query for products with filters
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Product[]>}
 */
const queryProductsByFilter = async (filter) => {
  const filtered = {};
  Object.keys(filter).forEach((key) => {
    if (filter[key] !== '') {
      filtered[key] = filter[key];
    }
  });
  filtered.isActive = true;
  filtered.parentProduct = { $exists: filtered.parentProduct };



  return Product.find(filtered)
    .sort({ price: -1 })
    .lean();
};
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

/**
 * Get all products
 * @returns {Promise<Product[]>}
 */

const getAllProducts = async () => {
  return Product.aggregate([
    { $match: { isActive: true } },
    { $sort: { price: 1 } },
  ]);
};

const getProductsCategorizedByCategory = async () => {
  return Product.aggregate([
    { $match: { isActive: true, isShowcase: true } },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    { $sort: { index: 1, 'category.name': -1 } },
    {
      $group: {
        _id: '$category.name',
        products: { $push: '$$ROOT' },
      },
    },
  ]);
};




/**
 * Get product by id
 * @param {ObjectId} id
 * @returns {Promise<Product>}
 */
const getProductById = async (id) => {
  return Product.findById(id);
};

/**
 * Update product by id
 * @param {ObjectId} productId
 * @param {Object} updateBody
 * @returns {Promise<Product>}
 */
const updateProductById = async (productId, updateBody) => {
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  // Check if new name already exists (if name is being updated)
  if (updateBody.name && updateBody.name !== product.name) {
    const nameExists = await Product.findOne({ name: updateBody.name, _id: { $ne: productId } });
    if (nameExists) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Product name already taken');
    }
  }

  // Handle image update
  let images = [];
  if (updateBody.images) {
    for (const image of updateBody.images) {
      // const uploadedImage = await uploadImage(image?.image, 'product');
      // console.log('uploadedImage ====>>>', uploadedImage);
      const public_id = image.image.split("/").pop().split(".")[0];

      images.push({
        url: image.image,
        publicId: "product/" + public_id,
      });
    }
  }

  return Product.findByIdAndUpdate(productId, { ...updateBody, images }, { new: true });
};

/**
 * Delete product by id
 * @param {ObjectId} productId
 * @returns {Promise<Product>}
 */
const deleteProductById = async (productId) => {
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  await Product.findByIdAndUpdate(productId, {name: `Deleted ${product.name}`, isActive: false }, { new: true });
  return product;
};

module.exports = {
  createProduct,
  queryProducts,
  getAllProducts,
  getProductById,
  updateProductById,
  deleteProductById,
  queryProductsByFilter,
  getProductsCategorizedByCategory
};


