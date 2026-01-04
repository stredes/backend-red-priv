const socialRepo = require('../repositories/social.repository');
const { normalizeEmail } = require('../utils/normalize');

async function createRequest(sender, receiverEmail) {
  const normalizedReceiver = normalizeEmail(receiverEmail);
  if (!normalizedReceiver) {
    throw new Error('Missing receiverEmail');
  }

  const normalizedSender = normalizeEmail(sender.email);
  if (!normalizedSender || normalizedSender === normalizedReceiver) {
    throw new Error('Invalid receiverEmail');
  }

  const friends = await socialRepo.listFriends(normalizedSender);
  const alreadyFriends = friends.some((item) => item.friendEmail === normalizedReceiver);
  if (alreadyFriends) {
    throw new Error('Already friends');
  }

  const existingPending = await socialRepo.getPendingRequestBetween(normalizedSender, normalizedReceiver);
  if (existingPending) {
    throw new Error('Request already pending');
  }

  const request = {
    senderEmail: normalizedSender,
    senderName: sender.name || '',
    receiverEmail: normalizedReceiver,
    status: 'PENDIENTE',
    timestamp: Date.now()
  };

  return socialRepo.createFriendRequest(request);
}

async function listIncoming(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return [];
  }

  const rawEmail = (email || '').trim();
  const requestPromises = [socialRepo.listIncomingRequests(normalizedEmail)];
  const friendPromises = [socialRepo.listFriends(normalizedEmail)];
  if (rawEmail && rawEmail !== normalizedEmail) {
    requestPromises.push(socialRepo.listIncomingRequests(rawEmail));
    friendPromises.push(socialRepo.listFriends(rawEmail));
  }

  const [requestResults, friendResults] = await Promise.all([
    Promise.all(requestPromises),
    Promise.all(friendPromises)
  ]);

  const requests = requestResults.flat();
  const friends = friendResults.flat();

  if (!friends.length) {
    return requests;
  }

  const friendSet = new Set(
    friends
      .map((item) => normalizeEmail(item.friendEmail))
      .filter(Boolean)
  );

  const filtered = requests.filter((request) => {
    const sender = normalizeEmail(request.senderEmail);
    return sender && !friendSet.has(sender);
  });

  const seen = new Set();
  return filtered.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

async function listOutgoing(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return [];
  }

  const rawEmail = (email || '').trim();
  const requestPromises = [socialRepo.listOutgoingRequests(normalizedEmail)];
  const friendPromises = [socialRepo.listFriends(normalizedEmail)];
  if (rawEmail && rawEmail !== normalizedEmail) {
    requestPromises.push(socialRepo.listOutgoingRequests(rawEmail));
    friendPromises.push(socialRepo.listFriends(rawEmail));
  }

  const [requestResults, friendResults] = await Promise.all([
    Promise.all(requestPromises),
    Promise.all(friendPromises)
  ]);

  const requests = requestResults.flat();
  const friends = friendResults.flat();

  if (!friends.length) {
    return requests;
  }

  const friendSet = new Set(
    friends
      .map((item) => normalizeEmail(item.friendEmail))
      .filter(Boolean)
  );

  const filtered = requests.filter((request) => {
    const receiver = normalizeEmail(request.receiverEmail);
    return receiver && !friendSet.has(receiver);
  });

  const seen = new Set();
  return filtered.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

async function acceptRequest(id, receiverEmail) {
  const request = await socialRepo.getRequestById(id);
  if (!request) {
    throw new Error('Request not found');
  }

  const normalizedReceiver = normalizeEmail(receiverEmail);
  if (request.receiverEmail !== normalizedReceiver) {
    throw new Error('Forbidden');
  }

  if (request.status !== 'PENDIENTE') {
    throw new Error('Request not pending');
  }

  await socialRepo.updateRequest(id, { status: 'ACEPTADA' });
  await socialRepo.createFriendPairs([
    { userEmail: request.senderEmail, friendEmail: request.receiverEmail },
    { userEmail: request.receiverEmail, friendEmail: request.senderEmail }
  ]);
  await socialRepo.markRequestsBetweenAccepted(request.senderEmail, request.receiverEmail);

  return { success: true };
}

async function rejectRequest(id, receiverEmail) {
  const request = await socialRepo.getRequestById(id);
  if (!request) {
    throw new Error('Request not found');
  }

  const normalizedReceiver = normalizeEmail(receiverEmail);
  if (request.receiverEmail !== normalizedReceiver) {
    throw new Error('Forbidden');
  }

  if (request.status !== 'PENDIENTE') {
    throw new Error('Request not pending');
  }

  await socialRepo.updateRequest(id, { status: 'RECHAZADA' });
  return { success: true };
}

async function listFriends(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return [];
  }

  const rawEmail = (email || '').trim();
  if (rawEmail && rawEmail !== normalizedEmail) {
    const [normalizedFriends, rawFriends] = await Promise.all([
      socialRepo.listFriends(normalizedEmail),
      socialRepo.listFriends(rawEmail)
    ]);

    const merged = [...normalizedFriends, ...rawFriends];
    const seen = new Set();
    return merged.filter((item) => {
      const key = `${item.userEmail || ''}__${item.friendEmail || ''}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  return socialRepo.listFriends(normalizedEmail);
}

module.exports = {
  createRequest,
  listIncoming,
  listOutgoing,
  acceptRequest,
  rejectRequest,
  listFriends
};
