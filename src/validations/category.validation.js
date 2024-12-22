const Joi = require('joi');

const createCategory = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    subCategories: Joi.array().items(Joi.string()),
    image: Joi.any().meta({ swaggerType: 'file' }), // for file upload
  }),
};

const getCategory = {
  params: Joi.object().keys({
    categoryId: Joi.string().required(),
  }),
};

const updateCategory = {
  params: Joi.object().keys({
    categoryId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string(),
    subCategories: Joi.array().items(Joi.string()),
    image: Joi.alternatives().try(Joi.string().uri(), Joi.any().meta({ swaggerType: 'file' })),
  }),
};

const deleteCategory = {
  params: Joi.object().keys({
    categoryId: Joi.string().required(),
  }),
};

// const createSubCategory = {
//   params: Joi.object().keys({
//     categoryId: Joi.string().required(),
//   }),
//   body: Joi.object().keys({
//     name: Joi.string().required(),
//     isActive: Joi.boolean(),
//   }),
// };

// const updateSubCategory = {
//   params: Joi.object().keys({
//     categoryId: Joi.string().required(),
//     subCategoryId: Joi.string().required(),
//   }),
//   body: Joi.object().keys({
//     name: Joi.string(),
//     isActive: Joi.boolean(),
//   }),
// };

// const deleteSubCategory = {
//   params: Joi.object().keys({
//     categoryId: Joi.string().required(),
//     subCategoryId: Joi.string().required(),
//   }),
// };

module.exports = {
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
  // createSubCategory,
  // updateSubCategory,
  // deleteSubCategory,
};