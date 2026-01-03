const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { nanoid } = require('nanoid');
const { put } = require('@vercel/blob');
const { createClient } = require('@vercel/edge-config');
const { bucket } = require('../config/firebase');
const { EDGE_CONFIG, EDGE_CONFIG_GALLERY_KEY } = require('../config/env');

const edgeClient = EDGE_CONFIG ? createClient(EDGE_CONFIG) : null;

async function uploadProductImage(file, { baseUrl } = {}) {
  const filename = `${uuidv4()}-${file.originalname}`;

  if (bucket) {
    const storagePath = `product_images/${filename}`;
    const storageFile = bucket.file(storagePath);

    await storageFile.save(file.buffer, {
      metadata: {
        contentType: file.mimetype
      },
      public: true
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    return { url: publicUrl, filename: storagePath };
  }

  const uploadDir = path.resolve(__dirname, '..', '..', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, file.buffer);

  const origin = baseUrl || '';
  const publicUrl = `${origin}/uploads/${encodeURIComponent(filename)}`;
  return { url: publicUrl, filename };
}

async function getGalleryItems() {
  if (!edgeClient) return [];
  const items = await edgeClient.get(EDGE_CONFIG_GALLERY_KEY);
  return Array.isArray(items) ? items : [];
}

async function appendGalleryItem(item) {
  if (!edgeClient) {
    throw new Error('EDGE_CONFIG not configured');
  }
  const items = await getGalleryItems();
  const nextItems = [item, ...items];
  await edgeClient.set(EDGE_CONFIG_GALLERY_KEY, nextItems);
  return nextItems;
}

async function uploadGalleryImage(file) {
  if (!file?.buffer) {
    throw new Error('Missing image');
  }
  const safeName = file.originalname?.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '') || 'image';
  const filename = `gallery/${nanoid(10)}-${safeName}`;
  const blob = await put(filename, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
  });
  const item = {
    id: nanoid(10),
    url: blob.url,
    filename: blob.pathname || filename,
    createdAt: new Date().toISOString(),
  };
  const items = await appendGalleryItem(item);
  return { item, items };
}

module.exports = { uploadProductImage, uploadGalleryImage, getGalleryItems };
