const { db, admin } = require('../config/firebase');

function pedidosCollection() {
  return db.collection('pedidos');
}

async function createPedido(pedidoId, payload) {
  await pedidosCollection().doc(pedidoId).set(payload);
}

async function getPedidoById(pedidoId) {
  const snapshot = await pedidosCollection().doc(pedidoId).get();
  return snapshot.exists ? snapshot.data() : null;
}

async function listByComprador(email, { page = 1, pageSize = 20, estado, desde, hasta } = {}) {
  let query = pedidosCollection().where('compradorEmail', '==', email);
  if (estado) query = query.where('estado', '==', estado);
  if (desde) query = query.where('fechaPedido', '>=', desde);
  if (hasta) query = query.where('fechaPedido', '<=', hasta);

  if (desde || hasta) {
    const offset = (page - 1) * pageSize;
    const snapshot = await query.orderBy('fechaPedido', 'desc').offset(offset).limit(pageSize).get();
    return snapshot.docs.map((doc) => doc.data());
  }

  const snapshot = await query.get();
  const all = snapshot.docs.map((doc) => doc.data());
  all.sort((a, b) => (b.fechaPedido || b.ultimaActualizacion || 0) - (a.fechaPedido || a.ultimaActualizacion || 0));
  const offset = (page - 1) * pageSize;
  return all.slice(offset, offset + pageSize);
}

async function listByProveedor(email, { page = 1, pageSize = 20, estado, desde, hasta } = {}) {
  let query = pedidosCollection().where('proveedorEmail', '==', email);
  if (estado) query = query.where('estado', '==', estado);
  if (desde) query = query.where('fechaPedido', '>=', desde);
  if (hasta) query = query.where('fechaPedido', '<=', hasta);

  if (desde || hasta) {
    const offset = (page - 1) * pageSize;
    const snapshot = await query.orderBy('fechaPedido', 'desc').offset(offset).limit(pageSize).get();
    return snapshot.docs.map((doc) => doc.data());
  }

  const snapshot = await query.get();
  const all = snapshot.docs.map((doc) => doc.data());
  all.sort((a, b) => (b.fechaPedido || b.ultimaActualizacion || 0) - (a.fechaPedido || a.ultimaActualizacion || 0));
  const offset = (page - 1) * pageSize;
  return all.slice(offset, offset + pageSize);
}

async function listByProveedorAndEstado(email, estado, options = {}) {
  return listByProveedor(email, { ...options, estado });
}

async function countByProveedorAndEstado(email, estado) {
  const snapshot = await pedidosCollection()
    .where('proveedorEmail', '==', email)
    .where('estado', '==', estado)
    .get();
  return snapshot.size;
}

async function countNotificacionesComprador(email) {
  const snapshot = await pedidosCollection()
    .where('compradorEmail', '==', email)
    .where('estado', 'not-in', ['ENTREGADO', 'CANCELADO'])
    .get();
  return snapshot.size;
}

async function updatePedido(pedidoId, updates) {
  await pedidosCollection().doc(pedidoId).update(updates);
}

async function createNotification(payload) {
  await db.collection('messages').add(payload);
}

async function createAudit(payload) {
  await db.collection('pedido_audits').add({
    ...payload,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

module.exports = {
  createPedido,
  getPedidoById,
  listByComprador,
  listByProveedor,
  listByProveedorAndEstado,
  countByProveedorAndEstado,
  countNotificacionesComprador,
  updatePedido,
  createNotification,
  createAudit
};
