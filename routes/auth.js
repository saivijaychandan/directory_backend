const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/index');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.put('/profile', auth, authController.updateProfile);

module.exports = router;