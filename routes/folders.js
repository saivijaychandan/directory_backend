const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const authMiddleware = require('../middleware');
const imageController = require('../controllers/imageController');

router.get('/', authMiddleware, folderController.getAllFolders);
router.post('/', authMiddleware, folderController.createFolder);
router.get('/:id', authMiddleware, folderController.getFolder);
router.put('/:id', authMiddleware, folderController.updateFolder);
router.delete('/:id', authMiddleware, folderController.deleteFolder);
router.get('/:folderId/images', authMiddleware, imageController.getImagesByFolder);

module.exports = router;