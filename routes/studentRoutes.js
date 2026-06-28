const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, verifyStudent } = require('../utils/authMiddleware');

router.use(verifyToken, verifyStudent);

router.get('/profile', studentController.getProfile);
router.get('/attendance-history', studentController.getAttendanceHistory);

module.exports = router;
