// routes/folders.js
const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const authMiddleware = require('../middleware/middleware');

// Routes for /api/folders
router.get('/', authMiddleware, folderController.getAllFolders);
router.post('/', authMiddleware, folderController.createFolder);

// Connect the new functions here:
router.put('/:id', authMiddleware, folderController.updateFolder);
router.delete('/:id', authMiddleware, folderController.deleteFolder);

module.exports = router;