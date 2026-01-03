const authService = require('../services/auth.service');

async function register(req, res) {
  try {
    const { name, email, password, rut } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await authService.register({ name, email, password, rut });
    return res.status(201).json(result);
  } catch (err) {
    if (err.message === 'Email already exists' || err.message === 'RUT already exists') {
      return res.status(409).json({ error: err.message });
    }
    if (err.message === 'Root registration is not allowed') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    const result = await authService.login({ email, password });
    return res.json(result);
  } catch (err) {
    if (err.message === 'Invalid credentials') {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Login failed' });
  }
}

async function me(req, res) {
  try {
    const user = await authService.me(req.user.email);
    return res.json({ user });
  } catch (err) {
    return res.status(404).json({ error: err.message });
  }
}

async function verifyEmail(req, res) {
  if (!req.body.email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const result = await authService.verifyEmail(req.body.email);
  return res.json(result);
}

async function resetPassword(req, res) {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const result = await authService.resetPassword({
      email,
      newPassword,
      requester: req.user
    });
    return res.json(result);
  } catch (err) {
    if (err.message === 'Forbidden') {
      return res.status(403).json({ error: err.message });
    }
    if (err.message === 'User not found') {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Reset failed' });
  }
}

async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Missing refreshToken' });
    }
    const tokens = await authService.refreshToken(refreshToken);
    return res.json(tokens);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }
    const result = await authService.requestPasswordReset(email);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Error al solicitar código de recuperación' });
  }
}

async function verifyResetCode(req, res) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email y código son requeridos' });
    }
    const result = await authService.verifyResetCode(email, code);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function confirmPasswordReset(req, res) {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const result = await authService.confirmPasswordReset(email, code, newPassword);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

module.exports = { 
  register, 
  login, 
  me, 
  verifyEmail, 
  resetPassword, 
  refresh,
  requestPasswordReset,
  verifyResetCode,
  confirmPasswordReset
};
