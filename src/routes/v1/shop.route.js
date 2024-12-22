const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const shopValidation = require('../../validations/shop.validation');
const shopController = require('../../controllers/shop.controller');

const router = express.Router();

router
  .route('/')
  .post(auth.verifyToken(), validate(shopValidation.createShop), shopController.createShop)
  .get(shopController.getShopsWithPagination);
router
  .route('/allShops')
  .get(shopController.getAllShops);

router
  .route('/:shopId')
  .get(validate(shopValidation.getShop), shopController.getShop)
  .put(auth.verifyToken(), validate(shopValidation.updateShop), shopController.updateShop)
  .delete(auth.verifyToken(), validate(shopValidation.deleteShop), shopController.deleteShop);


// router
//   .route('/:shopId/subcategories')
//   .post(auth.verifyToken(), validate(shopValidation.createSubShop), shopController.createSubShop);

// router
//   .route('/:shopId/subcategories/:subShopId')
//   .patch(auth.verifyToken(), validate(shopValidation.updateSubShop), shopController.updateSubShop)
//   .delete(auth.verifyToken(), validate(shopValidation.deleteSubShop), shopController.deleteSubShop);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Shop
 *   description: Shop management and retrieval
 */

/**
 * @swagger
 * /shop:
 *   post:
 *     summary: Create a shop
 *     tags: [Shop]
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
 *                $ref: '#/components/schemas/Shop'
 *       "401": 
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

