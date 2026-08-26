const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const config = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const { initializeSocket } = require('./src/config/socket');
const errorHandler = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiter');

// Import Routes
const authRoutes = require('./src/routes/authRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const applicationRoutes = require('./src/routes/applicationRoutes');
const programRoutes = require('./src/routes/programRoutes');
const documentRoutes = require('./src/routes/documentRoutes');
const eligibilityRoutes = require('./src/routes/eligibilityRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const admissionRoutes = require('./src/routes/admissionRoutes');
const enrollmentRoutes = require('./src/routes/enrollmentRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const counselorRoutes = require('./src/routes/counselorRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const healthRoutes = require('./src/routes/healthRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server, config.CLIENT_URL);

// Security & Utility Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: [config.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static uploads folder for local fallback
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// Health checks
app.use('/health', healthRoutes);

// Apply API rate limiting
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admission', admissionRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/counselor', counselorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

const { startCostMonitoring } = require('./src/services/costProtectionService');

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Initialize real-time AWS cost protection & safety monitor
    startCostMonitoring();

    server.listen(config.PORT, () => {
      console.log(`=======================================================`);
      console.log(` AUTONOMOUS ADMISSIONS & LIFECYCLE BACKEND SERVICE`);
      console.log(` Mode: ${config.NODE_ENV}`);
      console.log(` Listening on: http://localhost:${config.PORT}`);
      console.log(` Health Check: http://localhost:${config.PORT}/health`);
      console.log(` AWS Budget Cap: $${config.AWS_BUDGET_LIMIT} | Emergency: $${config.AWS_EMERGENCY_THRESHOLD}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error(`Failed to start backend server: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server };
