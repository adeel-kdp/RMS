const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const categoryValidation = require('../../validations/category.validation');
const categoryController = require('../../controllers/category.controller');
const { upload } = require('../../utils/imageUploader');

const router = express.Router();

router
  .route('/')
  .post(auth.verifyToken(), validate(categoryValidation.createCategory), categoryController.createCategory)
  .get(categoryController.getCategoriesWithPagination);
router
  .route('/allCategories')
  .get(categoryController.getAllCategories);

router
  .route('/:categoryId')
  .get(validate(categoryValidation.getCategory), categoryController.getCategory)
  .put(auth.verifyToken(), validate(categoryValidation.updateCategory), categoryController.updateCategory)
  .delete(auth.verifyToken(), validate(categoryValidation.deleteCategory), categoryController.deleteCategory);


// router
//   .route('/:categoryId/subcategories')
//   .post(auth.verifyToken(), validate(categoryValidation.createSubCategory), categoryController.createSubCategory);

// router
//   .route('/:categoryId/subcategories/:subCategoryId')
//   .patch(auth.verifyToken(), validate(categoryValidation.updateSubCategory), categoryController.updateSubCategory)
//   .delete(auth.verifyToken(), validate(categoryValidation.deleteSubCategory), categoryController.deleteSubCategory);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Category
 *   description: Category management and retrieval
 */

/**
 * @swagger
 * /category:
 *   post:
 *     summary: Create a category
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - isActive
 *             properties:
 *               name:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *             example:
 *               name: fake name
 *               isActive: true 
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Category'
 *       "401": 
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

