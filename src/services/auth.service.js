const bcrypt = require('bcryptjs');
const { admin } = require('../config/firebase');
const { ROOT_EMAIL, ROOT_PASSWORD } = require('../config/env');
const { normalizeEmail } = require('../utils/normalize');
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } = require('../utils/tokens');
const usersRepo = require('../repositories/users.repository');
const refreshRepo = require('../repositories/refreshTokens.repository');
const resetCodesRepo = require('../repositories/resetCodes.repository');

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti } = signRefreshToken(user);
  await refreshRepo.saveRefreshToken({
    jti,
    email: user.email,
    tokenHash: hashToken(refreshToken),
    revoked: false
  });
  return { accessToken, refreshToken };
}

async function ensureRootUser() {
  if (!ROOT_PASSWORD) return;
  const existing = await usersRepo.getUserByEmail(ROOT_EMAIL);
  if (existing) return;

  const hash = await bcrypt.hash(ROOT_PASSWORD, 10);
  await usersRepo.createUser(ROOT_EMAIL, {
    name: 'Super Usuario',
    email: ROOT_EMAIL,
    passwordHash: hash,
    role: 'root',
    rut: '',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function register({ name, email, password, rut }) {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail === ROOT_EMAIL) {
    throw new Error('Root registration is not allowed');
  }

  const existing = await usersRepo.getUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('Email already exists');
  }

  if (rut) {
    const rutExists = await usersRepo.findByRut(rut);
    if (rutExists) {
      throw new Error('RUT already exists');
    }
  }

  const hash = await bcrypt.hash(password, 10);
  const user = {
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hash,
    role: 'user',
    rut: (rut || '').trim().toUpperCase(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await usersRepo.createUser(normalizedEmail, user);
  const tokens = await issueTokens(user);
  return {
    ...tokens,
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      rut: user.rut
    }
  };
}

async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await usersRepo.getUserByEmail(normalizedEmail);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const matches = await bcrypt.compare(password, user.passwordHash || '');
  if (!matches) {
    throw new Error('Invalid credentials');
  }

  const tokens = await issueTokens(user);
  return {
    ...tokens,
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      rut: user.rut || ''
    }
  };
}

async function me(email) {
  const user = await usersRepo.getUserByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    rut: user.rut || ''
  };
}

async function verifyEmail(email) {
  const user = await usersRepo.getUserByEmail(normalizeEmail(email));
  return { exists: !!user };
}

async function resetPassword({ email, newPassword, requester }) {
  const normalizedEmail = normalizeEmail(email);
  if (requester.role !== 'root' && requester.email !== normalizedEmail) {
    throw new Error('Forbidden');
  }

  const user = await usersRepo.getUserByEmail(normalizedEmail);
  if (!user) {
    throw new Error('User not found');
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await usersRepo.updateUser(normalizedEmail, { passwordHash: hash });
  await refreshRepo.revokeAllForUser(normalizedEmail);
  return { success: true };
}

async function refreshToken(token) {
  const payload = verifyRefreshToken(token);
  const stored = await refreshRepo.getRefreshToken(payload.jti);
  if (!stored || stored.revoked) {
    throw new Error('Invalid refresh token');
  }

  if (stored.tokenHash !== hashToken(token)) {
    throw new Error('Invalid refresh token');
  }

  const user = await usersRepo.getUserByEmail(payload.sub);
  if (!user) {
    throw new Error('Invalid refresh token');
  }

  await refreshRepo.revokeRefreshToken(payload.jti);
  const tokens = await issueTokens(user);
  return tokens;
}

/**
 * Genera un código de 6 dígitos aleatorio
 */
function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Solicita un código de recuperación de contraseña
 */
async function requestPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);
  const user = await usersRepo.getUserByEmail(normalizedEmail);
  
  if (!user) {
    // Por seguridad, no revelamos si el email existe o no
    return { success: true, message: 'Si el correo existe, recibirás un código de recuperación' };
  }
  
  // Generar código de 6 dígitos
  const code = generateResetCode();
  const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutos
  
  // Guardar código en la base de datos
  await resetCodesRepo.saveResetCode({
    email: normalizedEmail,
    code,
    expiresAt
  });
  
  // TODO: Aquí se debería enviar el código por email
  // Por ahora, lo retornamos en la respuesta (solo para desarrollo)
  console.log(`Código de recuperación para ${normalizedEmail}: ${code}`);
  
  return {
    success: true,
    message: 'Código enviado a tu correo electrónico',
    // En producción, NO incluir el código en la respuesta
    resetToken: code // Solo para desarrollo
  };
}

/**
 * Verifica un código de recuperación
 */
async function verifyResetCode(email, code) {
  const normalizedEmail = normalizeEmail(email);
  const resetData = await resetCodesRepo.getResetCode(normalizedEmail);
  
  if (!resetData) {
    throw new Error('Código de verificación no encontrado');
  }
  
  if (resetData.used) {
    throw new Error('Este código ya fue utilizado');
  }
  
  if (Date.now() > resetData.expiresAt) {
    await resetCodesRepo.deleteResetCode(normalizedEmail);
    throw new Error('El código ha expirado');
  }
  
  if (resetData.code !== code) {
    throw new Error('Código de verificación inválido');
  }
  
  return { success: true, message: 'Código verificado correctamente' };
}

/**
 * Confirma el restablecimiento de contraseña con código verificado
 */
async function confirmPasswordReset(email, code, newPassword) {
  const normalizedEmail = normalizeEmail(email);
  
  // Verificar el código nuevamente
  await verifyResetCode(normalizedEmail, code);
  
  // Actualizar la contraseña
  const user = await usersRepo.getUserByEmail(normalizedEmail);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }
  
  const hash = await bcrypt.hash(newPassword, 10);
  await usersRepo.updateUser(normalizedEmail, { passwordHash: hash });
  
  // Marcar el código como usado
  await resetCodesRepo.markCodeAsUsed(normalizedEmail);
  
  // Revocar todos los tokens de refresh del usuario
  await refreshRepo.revokeAllForUser(normalizedEmail);
  
  return { success: true, message: 'Contraseña actualizada correctamente' };
}

module.exports = {
  ensureRootUser,
  register,
  login,
  me,
  verifyEmail,
  resetPassword,
  refreshToken,
  requestPasswordReset,
  verifyResetCode,
  confirmPasswordReset
};
