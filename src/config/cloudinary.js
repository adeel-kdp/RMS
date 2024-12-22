const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: 'drvvoncuk', 
  api_key: '884792371543527', 
  api_secret: "Judy5VZSKK70CCRubGnZErYb-Wc"
  // CLOUDINARY_URL=cloudinary://884792371543527:Judy5VZSKK70CCRubGnZErYb-Wc@drvvoncuk
});
module.exports = cloudinary;