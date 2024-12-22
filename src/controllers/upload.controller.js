const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { uploadImage, deleteImage } = require('../services/cloudinary.service');


const uploadFile = catchAsync(async (req, res) => {
  console.log("req.body ====>>>",req.body.image);
  const image = await uploadImage(req.body.image, "product");
  console.log("image ====>>>",image);
  res.send(image);
});

const deleteFile = catchAsync(async (req, res) => {
  console.log("req.params.fileId ====>>>",req.params.fileId);
  const {folder} = req.body
  await deleteImage(folder+"/"+req.params.fileId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  deleteFile,
  uploadFile,
};
