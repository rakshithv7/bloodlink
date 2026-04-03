/*const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt.utils');
const User = require('../models/User.model');
const logger = require('../utils/logger');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  // JWT Authentication for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('name role isActive');
      if (!user || !user.isActive) return next(new Error('Unauthorized'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`Socket connected: ${user.name} (${user.role})`);

    // Join role-based rooms
    socket.join(`user-${user._id}`);
    if (['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'MANAGER'].includes(user.role)) {
      socket.join('admins');
    }
    if (user.role === 'SUPER_ADMIN') {
      socket.join('super-admin');
    }

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${user.name}`);
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };*/
const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt.utils');
const User = require('../models/User.model');
const logger = require('../utils/logger');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        'http://localhost:3000'
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'], // 🔥 Important for Render
  });

  // 🔐 JWT Authentication for sockets
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1] ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(token);

      const user = await User.findById(decoded.id).select('name role isActive');
      if (!user || !user.isActive) {
        return next(new Error('Unauthorized'));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.error('Socket auth error:', err.message);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    logger.info(`🔌 Socket connected: ${user.name} (${user.role})`);

    // 👤 Join personal room
    socket.join(`user-${user._id}`);

    // 👨‍⚕️ Admin roles
    if (['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'MANAGER'].includes(user.role)) {
      socket.join('admins');
    }

    if (user.role === 'SUPER_ADMIN') {
      socket.join('super-admin');
    }

    // 📡 Example ping (helps debug Render issues)
    socket.emit('connected', {
      message: 'Socket connected successfully',
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });

    socket.on('disconnect', () => {
      logger.info(`❌ Socket disconnected: ${user.name}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initSocket, getIO };