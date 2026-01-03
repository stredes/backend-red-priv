/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { uploadGalleryImage } = require('../src/services/uploads.service');
const { BLOB_READ_WRITE_TOKEN, EDGE_CONFIG } = require('../src/config/env');

const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'public');

const EXT_TO_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function run() {
  if (!BLOB_READ_WRITE_TOKEN || !EDGE_CONFIG) {
    console.error('Faltan variables BLOB_READ_WRITE_TOKEN o EDGE_CONFIG.');
    process.exit(1);
  }

  if (!fs.existsSync(PUBLIC_DIR)) {
    console.error(`No se encontro el directorio public: ${PUBLIC_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(PUBLIC_DIR);
  const imageFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return Boolean(EXT_TO_MIME[ext]);
  });

  if (imageFiles.length === 0) {
    console.log('No hay imagenes en public para subir.');
    return;
  }

  console.log(`Subiendo ${imageFiles.length} imagen(es) desde public...`);

  for (const file of imageFiles) {
    const ext = path.extname(file).toLowerCase();
    const mimetype = EXT_TO_MIME[ext];
    const buffer = fs.readFileSync(path.join(PUBLIC_DIR, file));
    const payload = {
      originalname: file,
      mimetype,
      buffer,
    };
    try {
      const { item } = await uploadGalleryImage(payload);
      console.log(`✓ ${file} -> ${item.url}`);
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
    }
  }
}

run();
