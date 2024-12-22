const multer = require('multer');
const path = require('path');
const ApiError = require('./ApiError');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp'];
  console.log("file.mimetype ====>>>",file.mimetype);
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG, BMP, TIFF, and WEBP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

const dataUri = (file) => {
  const b64 = Buffer.from(file.buffer).toString('base64');
  return `data:${file.mimetype};base64,${b64}`;
};

module.exports = {
  upload,
  dataUri,
};
