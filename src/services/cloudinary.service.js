const ApiError = require('../utils/ApiError');
const cloudinary_js_config  = require('../config/cloudinary');
const { dataUri } = require('../utils/imageUploader');

const uploadImage = async (file, folder, options = {}) => {
    if (!file) {
      throw new ApiError('No file provided', 400);
    }

    const defaultOptions = {
      resource_type: 'auto',
      folder,
      ...options
    };
    console.log("defaultOptions ====>>>",defaultOptions);
    
    const result = await cloudinary_js_config.uploader.upload(file, defaultOptions);
    console.log("result ====>>>",result);
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at
    };
  
};

const deleteImage = async (publicId) => {
  try {
    if (!publicId) {
      throw new ApiError('No public ID provided', 400);
    }
    console.log("publicId ====>>>",publicId);
    // "product/b5fydoirw1b5axnp1uuj"

    const result = await cloudinary_js_config.uploader.destroy(publicId);
    console.log("result ====>>>",result);
    
    if (result.result !== 'ok') {
      throw new ApiError('Failed to delete image from Cloudinary', 400);
    }

    return { message: 'Image deleted successfully' };
  } catch (error) {
    throw new ApiError(error.message || 'Error deleting image from Cloudinary', error.statusCode || 500);
  }
};

const updateImage = async (publicId, file, folder, options = {}) => {
  try {
    await deleteImage(publicId);
    return await uploadImage(file, folder, options);
  } catch (error) {
    throw new ApiError('Error updating image', 500);
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  updateImage,
};
