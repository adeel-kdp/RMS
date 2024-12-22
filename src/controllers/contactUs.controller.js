const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { contactUsService, emailService } = require('../services');

const createContactUs = catchAsync(async (req, res) => {
  const { name, email, phone, file, message } = req.body;
  const subject = `Contact Us - ${name}`;
  await emailService.sendContactUsEmail(email, subject, phone, file, message);
  res.status(httpStatus.CREATED).send({ message: 'Email sent successfully' });

});

module.exports = {
  createContactUs,
};
