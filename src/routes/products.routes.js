const express = require('express');
const multer = require('multer');
const productsController = require('../controllers/products.controller');
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

router.get('/', productsController.listProducts);
router.get('/:id', productsController.getProduct);
router.post('/', authenticateToken, requireRole('admin', 'root', 'provider'), upload.single('image'), productsController.createProduct);
router.put('/:id', authenticateToken, requireRole('admin', 'root', 'provider'), productsController.updateProduct);
router.delete('/:id', authenticateToken, requireRole('admin', 'root', 'provider'), productsController.deleteProduct);

module.exports = router;
