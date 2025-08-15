// index.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();

/* ---------------- MySQL Connection ---------------- */
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL.replace('&ssl-mode=REQUIRED', ''),
  ssl: {
    ca: fs.readFileSync(process.env.MYSQL_SSL_CA),
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use((req, res, next) => {
  req.db = pool;
  next();
});

/* ---------------- MongoDB Connection ---------------- */
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ MongoDB connected');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

/* ---------------- Middleware ---------------- */
app.use(cors());
app.use(express.json());

/* ---------------- Multer Config for Book Images ---------------- */
const bookStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/books');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Unique filename: book-<timestamp>.<ext>
    const ext = path.extname(file.originalname);
    cb(null, `book-${Date.now()}${ext}`);
  },
});
const uploadBookImage = multer({ storage: bookStorage });

// Make uploadBookImage available to routes via req
app.use((req, res, next) => {
  req.uploadBookImage = uploadBookImage;
  next();
});

/* ---------------- Serve Uploaded Images ---------------- */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* ---------------- Route Mounting ---------------- */
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/books', require('./routes/book.routes'));
app.use('/api/borrow', require('./routes/borrow.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

/* ---------------- Health Check ---------------- */
app.get('/', (req, res) => {
  res.send('📚 Smart Library Platform API is live!');
});

/* ---------------- Start Server + Socket.IO ---------------- */
// ⬇️ Socket.IO additions (keep the rest of your file the same)
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 4000;

// Create an HTTP server from your existing Express app
const server = http.createServer(app);

// Attach Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'], // add other frontend origins if needed
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  },
});

// Make io available to routes (req.app.get('io'))
app.set('io', io);

// Optional: per-user rooms to target events to a single user
io.on('connection', (socket) => {
  socket.on('join-user', (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
