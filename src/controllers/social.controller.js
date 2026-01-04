const socialService = require('../services/social.service');

async function createRequest(req, res) {
  try {
    const result = await socialService.createRequest(req.user, req.body.receiverEmail);
    return res.status(201).json(result);
  } catch (err) {
    if (err.message === 'Missing receiverEmail') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'Invalid receiverEmail') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'Already friends') {
      return res.status(409).json({ error: err.message });
    }
    if (err.message === 'Request already pending') {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Request failed' });
  }
}

async function listIncoming(req, res) {
  const requests = await socialService.listIncoming(req.user.email);
  return res.json({ requests });
}

async function listOutgoing(req, res) {
  const requests = await socialService.listOutgoing(req.user.email);
  return res.json({ requests });
}

async function acceptRequest(req, res) {
  try {
    const result = await socialService.acceptRequest(req.params.id, req.user.email);
    return res.json(result);
  } catch (err) {
    if (err.message === 'Request not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === 'Forbidden') {
      return res.status(403).json({ error: err.message });
    }
    if (err.message === 'Request not pending') {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Accept failed' });
  }
}

async function rejectRequest(req, res) {
  try {
    const result = await socialService.rejectRequest(req.params.id, req.user.email);
    return res.json(result);
  } catch (err) {
    if (err.message === 'Request not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === 'Forbidden') {
      return res.status(403).json({ error: err.message });
    }
    if (err.message === 'Request not pending') {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Reject failed' });
  }
}

async function listFriends(req, res) {
  const friends = await socialService.listFriends(req.user.email);
  return res.json({ friends });
}

module.exports = {
  createRequest,
  listIncoming,
  listOutgoing,
  acceptRequest,
  rejectRequest,
  listFriends
};
