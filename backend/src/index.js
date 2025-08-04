const express = require('express');
const cors = require('cors');
const fs = require('fs');
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// ------------ MySQL Connection Pool ------------
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL.replace('&ssl-mode=REQUIRED', ''), // remove SSL hint
  ssl: {
    ca: fs.readFileSync(process.env.MYSQL_SSL_CA), // path to ca.pem
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Inject MySQL pool into every request as req.db
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// ------------ MongoDB Connection (Mongoose) ------------
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ------------ Middleware ------------
app.use(cors());
app.use(express.json());

// ------------ Route Imports ------------
let authRoutes, userRoutes, bookRoutes, borrowRoutes, reviewRoutes, analyticsRoutes;

try {
  authRoutes = require('./routes/auth.routes');
  bookRoutes = require('./routes/book.routes');
  borrowRoutes = require('./routes/borrow.routes');
  reviewRoutes = require('./routes/review.routes');
  analyticsRoutes = require('./routes/analytics.routes');

  try {
    userRoutes = require('./routes/user.routes');
  } catch (e) {
    console.warn('⚠️ user.routes.js not found – skipping /api/users');
  }
} catch (err) {
  console.error('❌ Error loading routes:', err);
  process.exit(1);
}

// ------------ Debug Route Types ------------
console.log('🧩 Route Modules Loaded:');
console.log('authRoutes:', typeof authRoutes);
console.log('userRoutes:', typeof userRoutes);
console.log('bookRoutes:', typeof bookRoutes);
console.log('borrowRoutes:', typeof borrowRoutes);
console.log('reviewRoutes:', typeof reviewRoutes);
console.log('analyticsRoutes:', typeof analyticsRoutes);

// ------------ Route Mounting ------------
try {
  if (typeof authRoutes === 'function') app.use('/api/auth', authRoutes);
  else console.warn('⚠️ authRoutes is not a function');

  if (typeof userRoutes === 'function') app.use('/api/users', userRoutes);
  else console.warn('⚠️ userRoutes is not a function or skipped');

  if (typeof bookRoutes === 'function') app.use('/api/books', bookRoutes);
  else console.warn('⚠️ bookRoutes is not a function');

  if (typeof borrowRoutes === 'function') app.use('/api/borrow', borrowRoutes);
  else console.warn('⚠️ borrowRoutes is not a function');

  if (typeof reviewRoutes === 'function') app.use('/api/reviews', reviewRoutes);
  else console.warn('⚠️ reviewRoutes is not a function');

  if (typeof analyticsRoutes === 'function') app.use('/api/analytics', analyticsRoutes);
  else console.warn('⚠️ analyticsRoutes is not a function');
} catch (err) {
  console.error('❌ Route registration failed:', err);
  process.exit(1);
}

// ------------ Health Check ------------
app.get('/', (req, res) => {
  res.send('📚 Smart Library Platform API is live!');
});

// ------------ Start Server ------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
