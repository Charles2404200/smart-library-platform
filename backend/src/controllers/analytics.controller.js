const ReadingSession = require('../models/ReadingSession');

exports.createSession = async (req, res) => {
  try {
    const session = await ReadingSession.create(req.body);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
