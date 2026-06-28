const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, verifyAdmin } = require('../utils/authMiddleware');

// Expose server time to any authenticated user
router.get('/server-time', verifyToken, settingsController.getServerTime);

router.use(verifyToken, verifyAdmin);

router.get('/', settingsController.getSettings);
router.post('/', settingsController.updateSettings);

router.get('/location', settingsController.getLocationSettings);
    router.put('/location', settingsController.updateLocationSettings);

module.exports = router;
