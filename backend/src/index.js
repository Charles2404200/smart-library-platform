// src/index.js
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
  // strip ssl-mode if present in the DATABASE_URL
  uri: (process.env.DATABASE_URL || '').replace('&ssl-mode=REQUIRED', ''),
  ssl: process.env.MYSQL_SSL_CA ? { ca: fs.readFileSync(process.env.MYSQL_SSL_CA) } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
app.use((req, _res, next) => { req.db = pool; next(); });

/* ---------------- MongoDB Connection ---------------- */
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true, useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

/* ---------------- CORS & Body Parsers ---------------- */
// If you use Authorization headers (Bearer token), you DON'T need cookies/credentials.
// Set explicit origins so preflight passes and allow Authorization header.
app.use(cors({
  origin: function (origin, callback) {
    const allowed = ['http://localhost:5173', 'http://localhost:4000'];
    if (!origin || allowed.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Authorization','Content-Type'],
}));

// JSON bodies
app.use(express.json());

// Accept sendBeacon payloads (text/plain) so req.body is a string we can JSON.parse
app.use(express.text({ type: 'text/plain' }));

/* ---------------- Multer Config for Book Images ---------------- */
const bookStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/books');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `book-${Date.now()}${ext}`);
  },
});
const uploadBookImage = multer({ storage: bookStorage });
app.use((req, _res, next) => { req.uploadBookImage = uploadBookImage; next(); });

/* ---------------- Static Files ---------------- */
// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve the default EPUB and any other reader assets from /public/assets
// Place your default file at: backend/public/assets/default.epub
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));

// (Optional) serve pdf.js UI if you also use the PDF reader anywhere
app.use('/pdfjs', express.static(path.join(__dirname, '../public/pdfjs')));

/* ---------------- Routes ---------------- */
app.use('/api/auth',    require('./routes/auth.routes'));
app.use('/api/users',   require('./routes/user.routes'));
app.use('/api/books',   require('./routes/book.routes'));
app.use('/api/borrow',  require('./routes/borrow.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/admin',   require('./routes/admin.routes'));
app.use('/api/review',  require('./routes/review.routes'));

// ⭐ Mount the ebooks routes (required by the reader)
app.use('/api/ebooks',  require('./routes/ebook.routes'));

// (If you have a separate reading analytics router that you actually use, mount it too)
// app.use('/api/reading-analytics', require('./routes/readingAnalytics.routes'));

/* ---------------- Health ---------------- */
app.get('/', (_req, res) => res.send('📚 Smart Library Platform API is live!'));
app.get('/healthz', (_req, res) => res.json({ ok: true }));

/* ---------------- Socket.IO ---------------- */
const http = require('http');
const { Server } = require('socket.io');
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:4000'],
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Authorization','Content-Type'],
  },
  transports: ['websocket','polling'],
  allowEIO3: false,
  pingTimeout: 20000,
  pingInterval: 25000,
});
io.engine.on('connection_error', (err) => {
  console.error('🚨 Socket.IO connection_error:', { code: err.code, message: err.message, context: err.context });
});
app.set('io', io);
io.on('connection', (socket) => {
  socket.on('join-user', (userId) => { if (userId) socket.join(`user:${userId}`); });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
