const { v4: uuidv4 } = require('uuid');
const productsRepo = require('../repositories/products.repository');
const { normalizeEmail } = require('../utils/normalize');
const { BLOB_PUBLIC_BASE_URL, IMAGE_CHECK_TTL_MS } = require('../config/env');
const https = require('https');
const http = require('http');

const imageValidationCache = new Map();

function resolveImageCandidate(product) {
  return product.imagenUri || product.img || '';
}

function isBlobUrl(url) {
  if (!BLOB_PUBLIC_BASE_URL) return true;
  return url.startsWith(BLOB_PUBLIC_BASE_URL);
}

function headRequest(url) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      resolve(false);
      return;
    }
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(
      parsed,
      { method: 'HEAD', timeout: 4000 },
      (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function validateImageUrl(url) {
  if (!url) return '';
  if (!isBlobUrl(url)) return '';
  const cached = imageValidationCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ok ? url : '';
  }
  const ok = await headRequest(url);
  imageValidationCache.set(url, { ok, expiresAt: Date.now() + IMAGE_CHECK_TTL_MS });
  return ok ? url : '';
}

async function attachValidatedImage(product) {
  const candidate = resolveImageCandidate(product);
  const resolved = await validateImageUrl(candidate);
  return {
    ...product,
    imagenUri: resolved || product.imagenUri || '',
    img: resolved || product.img || ''
  };
}

async function listProducts({ providerEmail, page, pageSize }) {
  const normalized = normalizeEmail(providerEmail);
  const products = await productsRepo.listProducts({
    providerEmail: normalized || null,
    page,
    pageSize
  });
  return Promise.all(products.map(attachValidatedImage));
}

async function getProduct(id) {
  const product = await productsRepo.getProductById(id);
  if (!product) {
    throw new Error('Product not found');
  }
  return attachValidatedImage(product);
}

async function createProduct(payload, requester) {
  const ownerEmail = requester.role === 'root'
    ? normalizeEmail(payload.providerEmail || requester.email)
    : requester.email;

  const id = uuidv4();
  const data = {
    nombre: payload.nombre.trim(),
    precioCLP: Number(payload.precioCLP),
    unidad: payload.unidad.trim(),
    descripcion: (payload.descripcion || '').trim(),
    imagenRes: 0,
    imagenUri: payload.imagenUri || '',
    providerEmail: ownerEmail
  };

  await productsRepo.createProduct(id, data);
  return { id, ...data };
}

async function updateProduct(id, payload, requester) {
  const existing = await productsRepo.getProductById(id);
  if (!existing) {
    throw new Error('Product not found');
  }

  if (requester.role !== 'root' && existing.providerEmail !== requester.email) {
    throw new Error('Forbidden');
  }

  const updates = {};
  ['nombre', 'precioCLP', 'unidad', 'descripcion', 'imagenUri'].forEach((key) => {
    if (payload[key] != null) {
      updates[key] = key === 'precioCLP' ? Number(payload[key]) : payload[key];
    }
  });

  await productsRepo.updateProduct(id, updates);
  return { success: true };
}

async function deleteProduct(id, requester) {
  const existing = await productsRepo.getProductById(id);
  if (!existing) {
    throw new Error('Product not found');
  }

  if (requester.role !== 'root' && existing.providerEmail !== requester.email) {
    throw new Error('Forbidden');
  }

  await productsRepo.deleteProduct(id);
  return { success: true };
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
};
