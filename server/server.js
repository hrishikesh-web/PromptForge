const path = require('path');
const dotenv = require('dotenv');
// Load server/.env before anything reads process.env
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { checkConnection } = require('./config/db');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const promptRoutes = require('./routes/prompt.routes');
const categoryRoutes = require('./routes/category.routes');
const modelRoutes = require('./routes/model.routes');
const tagRoutes = require('./routes/tag.routes');
const interactionRoutes = require('./routes/interaction.routes');
const notificationRoutes = require('./routes/notification.routes');
const reportRoutes = require('./routes/report.routes');
const adminRoutes = require('./routes/admin.routes');
const analyticsRoutes = require('./routes/analytics.routes');


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint with real database status
app.get('/api/health', async (req, res) => {
  const dbStatus = await checkConnection();
  return res.status(dbStatus.connected ? 200 : 503).json({
    status: dbStatus.connected ? 'healthy' : 'degraded',
    service: 'PromptForge API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      type: 'MySQL 8+',
      connected: dbStatus.connected,
      error: dbStatus.error || null
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/interactions', interactionRoutes);
// Direct aliases for convenience
app.use('/api', interactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`=========================================`);
    console.log(` PROMPTFORGE API SERVER RUNNING ON PORT ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);

    const dbStatus = await checkConnection();
    if (dbStatus.connected) {
      console.log('✔ MySQL Database connected successfully.');
    } else {
      console.warn('⚠ MySQL Database not connected: ' + dbStatus.error);
      console.warn('  Configure your MySQL credentials in server/.env and run: npm run db:setup');
    }
  });
}

module.exports = app;
