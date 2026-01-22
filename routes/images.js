// routes/images.js
const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const authMiddleware = require('../middleware'); // Adjust path if needed
const upload = require('../config/multer'); // Use the config file we made earlier

// Routes starting with /api/images

// Upload (Protected + Multer)
router.post('/', authMiddleware, upload.single('imageFile'), imageController.uploadImage);

// Get Image Data (Public or Protected? Your choice. Usually public for <img> tags)
router.get('/:id', imageController.getImageData);

// Rename, Copy, Move, Delete
router.put('/:id', authMiddleware, imageController.renameImage);
router.delete('/:id', authMiddleware, imageController.deleteImage);
router.post('/:id/copy', authMiddleware, imageController.copyImage);
router.put('/:id/move', authMiddleware, imageController.moveImage);

module.exports = router;