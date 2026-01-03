const express = require('express');
const multer = require('multer');
const uploadsController = require('../controllers/uploads.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ALLOWED_MIME_TYPES, UPLOAD_MAX_MB } = require('../config/env');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error(`Invalid file type: ${file.mimetype}`));
  }
});

router.post('/products', authenticateToken, requireRole('admin', 'root', 'provider'), upload.single('image'), uploadsController.uploadProduct);
router.get('/gallery', uploadsController.listGallery);
router.post('/gallery', authenticateToken, requireRole('admin', 'root', 'provider'), upload.single('image'), uploadsController.uploadGallery);

module.exports = router;
