require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { initSocket } = require('./sockets');
const { initCronJobs } = require('./jobs');
const { errorHandler, notFound } = require('./middleware/error.middleware');

// Routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const donationRoutes = require('./routes/donation.routes');
const requestRoutes = require('./routes/request.routes');

// Ensure /tmp/uploads exists
if (!fs.existsSync('/tmp/uploads')) fs.mkdirSync('/tmp/uploads', { recursive: true });
if (!fs.existsSync('logs')) fs.mkdirSync('logs', { recursive: true });

const app = express();
const server = http.createServer(app);

// Connect DB
connectDB();

// Init Socket.io
initSocket(server);

// Init cron jobs
initCronJobs();

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests' },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(globalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/requests', requestRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// 404 & Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`));

module.exports = app;
