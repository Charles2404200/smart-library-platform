const { registerUser, loginUser } = require('../services/auth.service');

const register = async (req, res) => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { token, user } = await loginUser(req.body);
    res.json({ message: 'Login successful', token, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = { register, login };
