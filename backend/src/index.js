const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
require('dotenv').config();

// Route imports

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL / MySQL via Prisma (no connect needed here, handled internally)

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Basic route
app.get('/', (req, res) => res.send('📚 Smart Library API running'));

// Mount routes

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
