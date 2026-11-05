const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

// Route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const providerRoutes = require('./routes/provider');
const categoryRoutes = require('./routes/categories');
const bookingRoutes = require('./routes/bookings');
const reviewRoutes = require('./routes/reviews');
const notificationRoutes = require('./routes/notifications');
const complaintRoutes = require('./routes/complaints');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const uploadRoutes = require('./routes/upload');

// Initialize app & server
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Attach io to express app so controllers can access req.app.get('io')
app.set('io', io);

// Socket.io room handling
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // User joins their personal room for notifications & updates
  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`[Socket.io] User ${userId} joined room`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Service Hub API',
    status: 'Running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'Healthy' });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);

// Central error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Service Hub Server running on port ${PORT}`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(`===============================================`);
});

module.exports = { app, server };
