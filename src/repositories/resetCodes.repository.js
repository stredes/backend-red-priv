// Repositorio para gestionar códigos de recuperación de contraseña
const { admin } = require('../config/firebase');

const COLLECTION = 'password_reset_codes';
const db = admin.firestore();

/**
 * Guarda un código de recuperación de contraseña
 */
async function saveResetCode({ email, code, expiresAt }) {
  const docRef = db.collection(COLLECTION).doc(email);
  await docRef.set({
    email,
    code,
    expiresAt,
    used: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Obtiene el código de recuperación para un email
 */
async function getResetCode(email) {
  const docRef = db.collection(COLLECTION).doc(email);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    return null;
  }
  
  return doc.data();
}

/**
 * Marca un código como usado
 */
async function markCodeAsUsed(email) {
  const docRef = db.collection(COLLECTION).doc(email);
  await docRef.update({
    used: true,
    usedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Elimina códigos de recuperación para un email
 */
async function deleteResetCode(email) {
  const docRef = db.collection(COLLECTION).doc(email);
  await docRef.delete();
}

/**
 * Limpia códigos expirados (debe ejecutarse periódicamente)
 */
async function cleanupExpiredCodes() {
  const now = Date.now();
  const snapshot = await db.collection(COLLECTION)
    .where('expiresAt', '<', now)
    .get();
  
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  return snapshot.size;
}

module.exports = {
  saveResetCode,
  getResetCode,
  markCodeAsUsed,
  deleteResetCode,
  cleanupExpiredCodes
};
