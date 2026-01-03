const uploadsService = require('../services/uploads.service');

async function uploadProduct(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing image' });
  }

  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await uploadsService.uploadProductImage(req.file, { baseUrl });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Upload failed' });
  }
}

async function uploadGallery(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing image' });
  }
  try {
    const result = await uploadsService.uploadGalleryImage(req.file);
    return res.json(result);
  } catch (err) {
    const message = err.message === 'EDGE_CONFIG not configured' ? err.message : 'Upload failed';
    return res.status(500).json({ error: message });
  }
}

async function listGallery(req, res) {
  try {
    const items = await uploadsService.getGalleryItems();
    return res.json({ items });
  } catch (err) {
    return res.status(500).json({ error: 'No pudimos cargar la galeria' });
  }
}

module.exports = { uploadProduct, uploadGallery, listGallery };
