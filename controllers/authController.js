const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ msg: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    await User.create({ 
        username, 
        password: hashedPassword
    });

    res.json({ message: "User created" });

  } catch (err) { res.status(500).send(err.message); }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) {
        return res.status(400).json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign({ user: { id: user.id } }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { username: user.username } });
  } catch (err) { res.status(500).send(err.message); }
};