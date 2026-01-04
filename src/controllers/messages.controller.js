const messagesService = require('../services/messages.service');

async function sendMessage(req, res) {
  try {
    const message = await messagesService.sendMessage(req.user, req.body);
    return res.status(201).json({ message });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function getInbox(req, res) {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const messages = await messagesService.listInbox(req.user.email, page, pageSize);
  return res.json({ messages });
}

async function getThread(req, res) {
  if (!req.query.with && !req.query.chatId) {
    return res.status(400).json({ error: 'Missing with parameter' });
  }
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 50);
  const messages = await messagesService.listThread(
    req.user.email,
    req.query.with,
    req.query.chatId,
    page,
    pageSize
  );
  return res.json({ messages });
}

module.exports = { sendMessage, getInbox, getThread };
