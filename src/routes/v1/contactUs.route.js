const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const contactUsValidation = require('../../validations/contactUs.validation');
const contactUsController = require('../../controllers/contactUs.controller');

const router = express.Router();

router
  .route('/')
  .post(validate(contactUsValidation.createContactUs), contactUsController.createContactUs);

module.exports = router;
