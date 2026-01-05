const productsService = require('../services/products.service');

async function listProducts(req, res) {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const productos = await productsService.listProducts({
    providerEmail: req.query.providerEmail,
    page,
    pageSize
  });
  return res.json({ productos });
}

async function getProduct(req, res) {
  try {
    const producto = await productsService.getProduct(req.params.id);
    return res.json({ producto });
  } catch (err) {
    return res.status(404).json({ error: err.message });
  }
}

async function createProduct(req, res) {
  const { nombre, precioCLP, precio, unidad } = req.body;
  const resolvedPrecio = precioCLP ?? precio;
  if (!nombre || resolvedPrecio == null || !unidad) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const producto = await productsService.createProduct(
      { ...req.body, file: req.file, baseUrl },
      req.user
    );
    return res.status(201).json({ producto });
  } catch (err) {
    if (err.message === 'Invalid imageUrl') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Create product failed' });
  }
}

async function updateProduct(req, res) {
  try {
    const result = await productsService.updateProduct(req.params.id, req.body, req.user);
    return res.json(result);
  } catch (err) {
    if (err.message === 'Product not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === 'Forbidden') {
      return res.status(403).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Update product failed' });
  }
}

async function deleteProduct(req, res) {
  try {
    const result = await productsService.deleteProduct(req.params.id, req.user);
    return res.json(result);
  } catch (err) {
    if (err.message === 'Product not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === 'Forbidden') {
      return res.status(403).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Delete product failed' });
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
};
