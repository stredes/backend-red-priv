const messagesRepo = require('../repositories/messages.repository');
const { normalizeEmail } = require('../utils/normalize');

function getChatId(emailA, emailB) {
  const pair = [emailA, emailB].sort();
  return `${pair[0]}__${pair[1]}`;
}

async function sendMessage(sender, payload) {
  const receiverEmail = normalizeEmail(payload.receiverEmail);
  if (!receiverEmail || !payload.content) {
    throw new Error('Missing fields');
  }

  const senderEmail = normalizeEmail(sender.email);
  if (!senderEmail) {
    throw new Error('Missing fields');
  }

  const message = {
    senderEmail,
    senderName: sender.name || '',
    receiverEmail,
    content: payload.content,
    type: payload.type || 'CHAT',
    timestamp: Date.now(),
    read: false
  };

  const existingChat = await messagesRepo.findChatByParticipants(senderEmail, receiverEmail);
  const chatId = existingChat ? existingChat.id : getChatId(senderEmail, receiverEmail);

  const chatPayload = {
    participants: [senderEmail, receiverEmail],
    lastMessage: message.content,
    lastMessageTimestamp: message.timestamp
  };

  return messagesRepo.createChatMessage(chatId, chatPayload, message);
}

async function listInbox(email, page, pageSize) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return [];
  }

  const chats = await messagesRepo.listInboxFromChatsHistory(normalizedEmail, page, pageSize);
  return chats.map((item) => {
    const participants = item.participants || [];
    const senderEmail = participants.find((participant) => participant !== normalizedEmail) || '';
    return {
      id: item.id,
      senderEmail,
      content: item.lastMessage || '',
      timestamp: item.lastMessageTimestamp || 0
    };
  });
}

async function listThread(email, otherEmail, chatId, page, pageSize) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOther = normalizeEmail(otherEmail);
  if (!normalizedEmail) {
    return [];
  }

  let resolvedChatId = chatId;
  if (!resolvedChatId && normalizedOther) {
    const existingChat = await messagesRepo.findChatByParticipants(normalizedEmail, normalizedOther);
    resolvedChatId = existingChat ? existingChat.id : null;
  }

  if (!resolvedChatId && normalizedOther) {
    resolvedChatId = getChatId(normalizedEmail, normalizedOther);
  }

  if (!resolvedChatId) {
    return [];
  }

  return messagesRepo.listThreadFromChatsHistory(resolvedChatId, normalizedEmail, page, pageSize);
}

module.exports = { sendMessage, listInbox, listThread };
