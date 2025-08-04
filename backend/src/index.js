const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
require('dotenv').config();
const authRoutes = require('./routes/auth.routes');
const bookRoutes = require('./routes/book.routes');
const borrowRoutes = require('./routes/borrow.routes');

const analyticsRoutes = require('./routes/analytics.routes'); // Đảm bảo file này tồn tại và export router

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api', borrowRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Basic test route
app.get('/', (req, res) => res.send('📚 Smart Library API running'));

// Mount additional routes
app.use('/api/analytics', analyticsRoutes); // Nhớ export router trong analytics.routes.js

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
