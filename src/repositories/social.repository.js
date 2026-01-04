const { db, admin } = require('../config/firebase');

async function createFriendRequest(payload) {
  const docRef = await db.collection('friend_requests').add(payload);
  return { id: docRef.id, request: payload };
}

async function listIncomingRequests(email) {
  const snapshot = await db.collection('friend_requests')
    .where('receiverEmail', '==', email)
    .where('status', '==', 'PENDIENTE')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function listOutgoingRequests(email) {
  const snapshot = await db.collection('friend_requests')
    .where('senderEmail', '==', email)
    .where('status', '==', 'PENDIENTE')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getRequestById(id) {
  const snapshot = await db.collection('friend_requests').doc(id).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

async function updateRequest(id, payload) {
  await db.collection('friend_requests').doc(id).update(payload);
}

async function createFriendPairs(pairs) {
  const batch = db.batch();
  pairs.forEach((item) => {
    const docId = `${item.userEmail}__${item.friendEmail}`;
    batch.set(db.collection('friends').doc(docId), {
      ...item,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  await batch.commit();
}

async function getPendingRequestBetween(emailA, emailB) {
  const [first, second] = await Promise.all([
    db.collection('friend_requests')
      .where('senderEmail', '==', emailA)
      .where('receiverEmail', '==', emailB)
      .where('status', '==', 'PENDIENTE')
      .get(),
    db.collection('friend_requests')
      .where('senderEmail', '==', emailB)
      .where('receiverEmail', '==', emailA)
      .where('status', '==', 'PENDIENTE')
      .get()
  ]);

  if (!first.empty) {
    const doc = first.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  if (!second.empty) {
    const doc = second.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  return null;
}

async function markRequestsBetweenAccepted(emailA, emailB) {
  const pendingSnapshots = await Promise.all([
    db.collection('friend_requests')
      .where('senderEmail', '==', emailA)
      .where('receiverEmail', '==', emailB)
      .where('status', '==', 'PENDIENTE')
      .get(),
    db.collection('friend_requests')
      .where('senderEmail', '==', emailB)
      .where('receiverEmail', '==', emailA)
      .where('status', '==', 'PENDIENTE')
      .get()
  ]);

  const batch = db.batch();
  let updates = 0;
  pendingSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'ACEPTADA' });
      updates += 1;
    });
  });

  if (updates === 0) {
    return;
  }

  await batch.commit();
}

async function listFriends(email) {
  const snapshot = await db.collection('friends')
    .where('userEmail', '==', email)
    .get();

  return snapshot.docs.map((doc) => doc.data());
}

module.exports = {
  createFriendRequest,
  listIncomingRequests,
  listOutgoingRequests,
  getRequestById,
  updateRequest,
  createFriendPairs,
  getPendingRequestBetween,
  markRequestsBetweenAccepted,
  listFriends
};
