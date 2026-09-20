require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Coworking API Docs',
  customCss: '.swagger-ui .topbar { background-color: #2d7d46; }',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true
  }
}));

// Swagger JSON (untuk Postman import)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
const makerRoutes = require('./routes/maker');
const authRoutes = require('./routes/auth');
const spacesRoutes = require('./routes/spaces');
const diskonRoutes = require('./routes/diskon');
const reservasiRoutes = require('./routes/reservasi');
const uploadRoutes = require('./routes/upload');

// Admin routes
const adminProfileRoutes = require('./routes/admin/profile');
const adminMembersRoutes = require('./routes/admin/members');
const adminSpacesRoutes = require('./routes/admin/spaces');
const adminDiskonRoutes = require('./routes/admin/diskon');
const adminReservasiRoutes = require('./routes/admin/reservasi');
const adminReportsRoutes = require('./routes/admin/reports');

// Root & Health
app.get('/', (req, res) => {
  res.json({
    status: true,
    statusCode: 200,
    message: 'Coworking Space Reservation API',
    data: {
      version: '1.0.0',
      description: 'Backend API untuk Aplikasi Reservasi Coworking Space',
      endpoints: {
        health: '/health',
        maker: '/api/maker',
        auth: '/api/auth',
        spaces: '/api/spaces',
        diskon: '/api/diskon',
        reservasi: '/api/reservasi',
        admin: '/api/admin',
        upload: '/api/upload'
      }
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: true,
    statusCode: 200,
    message: 'Server is running healthy',
    data: {
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/maker', makerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/diskon', diskonRoutes);
app.use('/api/reservasi', reservasiRoutes);
app.use('/api/upload', uploadRoutes);

// Admin routes
app.use('/api/admin/profile', adminProfileRoutes);
app.use('/api/admin/members', adminMembersRoutes);
app.use('/api/admin/spaces', adminSpacesRoutes);
app.use('/api/admin/diskon', adminDiskonRoutes);
app.use('/api/admin/reservasi', adminReservasiRoutes);
app.use('/api/admin/reports', adminReportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: false,
    statusCode: 404,
    message: 'Endpoint tidak ditemukan',
    error: `Route ${req.method} ${req.originalUrl} tidak tersedia`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.statusCode || 500).json({
    status: false,
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Coworking Backend running on port ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
