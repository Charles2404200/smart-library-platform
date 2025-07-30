const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
require('dotenv').config();
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// Test route
app.get('/', (req, res) => res.send("API is working"));
app.use('/api/analytics', analyticsRoutes);

// Start server
const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
