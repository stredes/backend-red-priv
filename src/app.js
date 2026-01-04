require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { CORS_ORIGINS } = require('./config/env');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const productsRoutes = require('./routes/products.routes');
const uploadsRoutes = require('./routes/uploads.routes');
const cartRoutes = require('./routes/cart.routes');
const ordersRoutes = require('./routes/orders.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const messagesRoutes = require('./routes/messages.routes');
const socialRoutes = require('./routes/social.routes');
const contactRoutes = require('./routes/contact.routes');
const authService = require('./services/auth.service');

const app = express();

const allowedOrigins = CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOriginPatterns = allowedOrigins
  .filter((origin) => origin.includes('*'))
  .map((origin) => new RegExp(`^${origin.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`));
const allowedOriginExact = allowedOrigins.filter((origin) => !origin.includes('*'));
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0) return callback(null, true);
    if (allowedOriginExact.includes(origin)) return callback(null, true);
    if (allowedOriginPatterns.some((pattern) => pattern.test(origin))) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Huerto Hogar Backend',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

function registerRoutes(prefix = '') {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/users`, usersRoutes);
  app.use(`${prefix}/products`, productsRoutes);
  app.use(`${prefix}/uploads`, uploadsRoutes);
  app.use(`${prefix}/cart`, cartRoutes);
  app.use(`${prefix}/orders`, ordersRoutes);
  app.use(`${prefix}/pedidos`, pedidosRoutes);
  app.use(`${prefix}/messages`, messagesRoutes);
  app.use(`${prefix}/social`, socialRoutes);
  app.use(`${prefix}/contact`, contactRoutes);
}

registerRoutes();
registerRoutes('/v1');

app.use((err, req, res, next) => {
  console.error(err.stack || err);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: err.message });
  }
  if (err.message && err.message.startsWith('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: 'Internal server error' });
});

authService.ensureRootUser().catch((err) => {
  console.error('Root user bootstrap failed:', err.message);
});

module.exports = app;
