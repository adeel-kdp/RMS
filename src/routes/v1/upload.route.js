const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const uploadValidation = require('../../validations/upload.validation');
const uploadController = require('../../controllers/upload.controller');

const router = express.Router();

router
  .route('/')
  .post(validate(uploadValidation.uploadFile), uploadController.uploadFile)

router
  .route('/:fileId')
  .delete(validate(uploadValidation.deleteFile), uploadController.deleteFile);

module.exports = router;
