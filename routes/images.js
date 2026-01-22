const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const authMiddleware = require('../middleware');
const upload = require('../config/multer');

router.post('/', authMiddleware, upload.single('imageFile'), imageController.uploadImage);

router.get('/:id', imageController.getImageData);

router.put('/:id', authMiddleware, imageController.renameImage);
router.delete('/:id', authMiddleware, imageController.deleteImage);
router.post('/:id/copy', authMiddleware, imageController.copyImage);
router.put('/:id/move', authMiddleware, imageController.moveImage);


module.exports = router;