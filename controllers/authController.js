const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const sendEmail = require('../utils/sendEmail');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ msg: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = await User.create({ 
      username, 
      password: hashedPassword 
    });

    const emailSubject = "Welcome to My Drive!";
    const emailBody = `Hi there! Your account has been created successfully. Your ID is ${newUser._id}`;

    sendEmail(username, emailSubject, emailBody);

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
    res.json({ 
        token, 
        user: { 
            id: user._id,
            username: user.username,
            name: user.name,
            age: user.age,
            phoneNumber: user.phoneNumber,
            isProfileSetup: user.isProfileSetup
        } 
    });
  } catch (err) { res.status(500).send(err.message); }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, age, phoneNumber } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.name = name;
    user.age = age;
    
    user.phone = phoneNumber; 
    
    user.isProfileSetUp = true; 

    await user.save();

    res.json({ 
        user: { 
            id: user._id, 
            username: user.username, 
            name: user.name,
            age: user.age,
            phoneNumber: user.phone,
            isProfileSetup: user.isProfileSetUp 
        } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};