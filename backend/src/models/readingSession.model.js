import mongoose from 'mongoose';
const readingSessionSchema = new mongoose.Schema({
  userId: String,
  bookId: String,
  startTime: Date,
  endTime: Date,
  device: String,
  pagesRead: Number,
  highlights: [String]
});
export default mongoose.model('ReadingSession', readingSessionSchema);
