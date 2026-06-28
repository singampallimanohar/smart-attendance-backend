const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../utils/authMiddleware');

router.use(verifyToken);

router.get('/', notificationController.getNotifications);
router.post('/read', notificationController.markAsRead);

module.exports = router;
