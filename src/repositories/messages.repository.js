const { db } = require('../config/firebase');

async function createMessage(message) {
  const docRef = await db.collection('messages').add(message);
  return { id: docRef.id, ...message };
}

async function listInbox(email, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const snapshot = await db.collection('messages')
    .where('receiverEmail', '==', email)
    .orderBy('timestamp', 'desc')
    .offset(offset)
    .limit(pageSize)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function listThread(email, page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;
  const snapshot = await db.collection('messages')
    .where('participants', 'array-contains', email)
    .orderBy('timestamp', 'desc')
    .offset(offset)
    .limit(pageSize)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function findChatByParticipants(userEmail, otherEmail) {
  const snapshot = await db.collection('chats_history')
    .where('participants', 'array-contains', userEmail)
    .get();

  const match = snapshot.docs.find((doc) => {
    const data = doc.data() || {};
    const participants = data.participants || [];
    return participants.includes(otherEmail);
  });

  return match ? { id: match.id, ...match.data() } : null;
}

async function listInboxFromChatsHistory(email, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const snapshot = await db.collection('chats_history')
    .where('participants', 'array-contains', email)
    .orderBy('lastMessageTimestamp', 'desc')
    .offset(offset)
    .limit(pageSize)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function listThreadFromChatsHistory(chatId, receiverEmail, page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;
  const snapshot = await db.collection('chats_history')
    .doc(chatId)
    .collection('mensajes')
    .orderBy('timestamp', 'asc')
    .offset(offset)
    .limit(pageSize)
    .get();

  const batch = db.batch();
  let updates = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    if (data.receiverEmail === receiverEmail && data.read === false) {
      batch.update(doc.ref, { read: true });
      updates += 1;
    }
  });

  if (updates > 0) {
    await batch.commit();
  }

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function createChatMessage(chatId, chatPayload, messagePayload) {
  await db.collection('chats_history').doc(chatId).set(chatPayload, { merge: true });
  const docRef = await db.collection('chats_history')
    .doc(chatId)
    .collection('mensajes')
    .add(messagePayload);
  return { id: docRef.id, ...messagePayload };
}

module.exports = {
  createMessage,
  listInbox,
  listThread,
  findChatByParticipants,
  listInboxFromChatsHistory,
  listThreadFromChatsHistory,
  createChatMessage
};
