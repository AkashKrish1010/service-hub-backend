const express = require('express');
const multer = require('multer');
const { uploadImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.post('/image', protect, upload.single('image'), uploadImage);

module.exports = router;
