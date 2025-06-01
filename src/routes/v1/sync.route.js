const express = require('express');
const { auth } = require('../../middlewares/auth');
const syncController = require('../../controllers/sync.controller');

const router = express.Router();

router.post('/orders', auth.verifyToken(), syncController.syncOfflineOrders);
router.get('/unsynced-orders', auth.verifyToken(), syncController.getUnsynedOrders);

module.exports = router;