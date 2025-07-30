const mongoose = require('mongoose');

const readingSessionSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  book_id: {
    type: String,
    required: true
  },
  start_time: {
    type: Date,
    required: true
  },
  end_time: {
    type: Date,
    required: true
  },
  device: String,
  pages_read: [Number],
  highlights: [String]
}, {
  timestamps: true
});

module.exports = mongoose.model('ReadingSession', readingSessionSchema);
