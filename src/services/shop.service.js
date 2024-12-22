const httpStatus = require('http-status');
const Shop = require('../models/shop.model');
const ApiError = require('../utils/ApiError');
/**
 * Create a shop
 * @param {Object} shopBody
 * @returns {Promise<Shop>}
 */
const createShop = async (shopBody, userId) => {
  const shop = await Shop.findOne({ name: shopBody.name });
  if (shop) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Shop already exists');
  }

  // let imageUrl = '';
  // let imagePublicId = '';
  // if (shopBody.image) {
  //   const image = await uploadImage(shopBody.image, 'shop');

  //   imageUrl = image.url;
  //   imagePublicId = image.public_id;
  // }

  const shopData = await Shop.create({ ...shopBody});

  // Update the user after the shop is created
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  user.shopIds.push(shopData._id);
  await user.save();

  return shopData;
};

/**
 * Query for categories with pagination
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
const queryShops = async (filter, options) => {
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
  const [categories, totalShops] = await Promise.all([
    Shop.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(), // Add lean() for better performance
    Shop.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalShops / limit);

  return {
    results: categories,
    page,
    limit,
    totalPages,
    totalResults: totalShops,
  };
};

/**
 * Get all categories
 * @returns {Promise<Shop[]>}
 */
const getAllShops = async () => {
  return Shop.find({isActive: true}).lean();
};

/**
 * Update shop by id
 * @param {ObjectId} shopId
 * @param {Object} updateBody
 * @returns {Promise<Shop>}
 */
const updateShopById = async (shopId, updateBody) => {
  // Check if shop exists
  const shop = await Shop.findById(shopId);
  if (!shop) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shop not found');
  }

  // Check if new name already exists (if name is being updated)
  if (updateBody.name && updateBody.name !== shop.name) {
    const nameExists = await Shop.findOne({ name: updateBody.name, _id: { $ne: shopId } });
    if (nameExists) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Shop name already taken');
    }
  }

  // Handle image update
  // let imageUrl = shop.imageUrl;
  // let imagePublicId = shop.imagePublicId;

  // if (updateBody.image) {
  //   // Check if the image is a base64 string
  //   const isBase64 = updateBody.image.includes('base64');

  //   if (isBase64) {
  //     // Delete old image from cloudinary if it exists
  //     if (shop.imagePublicId) {
  //       try {
  //         await deleteImage(shop.imagePublicId);
  //       } catch (error) {
  //         console.error('Error deleting old image:', error);
  //         // Continue with the update even if deletion fails
  //       }
  //     }

  //     // Upload new image
  //     const image = await uploadImage(updateBody.image, 'shop');
  //     imageUrl = image.url;
  //     imagePublicId = image.public_id;
  //   } else {
  //     // If not base64, assume it's the existing URL, keep the current values
  //     imageUrl = shop.imageUrl;
  //     imagePublicId = shop.imagePublicId;
  //   }
  // }

  // // Remove image from updateBody to prevent direct updates
  // delete updateBody.image;

  // Update shop with new values
  const updatedShop = await Shop.findByIdAndUpdate(
    shopId,
    {
      ...updateBody,
    },
    {
      new: true, // Return the updated document
      runValidators: true, // Run schema validators
    }
  );

  return updatedShop;
};

/**
 * Delete shop by id
 * @param {ObjectId} shopId
 * @returns {Promise<Shop>}
 */
const deleteShopById = async (shopId) => {
  const shop = await Shop.findById(shopId);
  if (!shop) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shop not found');
  }

  await Shop.findByIdAndUpdate(
    shopId,
    {
      isActive: false,
    },
    {
      new: true,
    }
  );
  return shop;
};

/**
 * Get shop by id
 * @param {ObjectId} id
 * @returns {Promise<Shop>}
 */
const getShopById = async (id) => {
  return Shop.findById(id);
};

module.exports = {
  createShop,
  updateShopById,
  deleteShopById,
  getShopById,
  queryShops,
  getAllShops,
};
