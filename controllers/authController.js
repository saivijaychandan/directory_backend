const jwt = require('jsonwebtoken');
const { User } = require('../models/models');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!password || password.length < 6) {
        return res.status(400).json({ msg: "Password too short" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
        return res.status(400).json({ msg: "Username must be a valid email address." });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ msg: "User already exists" });

    await User.create({ username, password });
    res.json({ message: "User created" });

  } catch (err) { res.status(500).send(err.message); }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user || user.password !== password) {
        return res.status(400).json({ msg: "Invalid credentials" });
    }
    
    const token = jwt.sign({ user: { id: user.id } }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) { res.status(500).send(err.message); }
};