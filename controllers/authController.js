const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto')

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ msg: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new User({ 
      username, 
      password: hashedPassword 
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    newUser.otp = otp;
    newUser.otpExpires = Date.now() + 10 * 60 * 1000;

    await newUser.save();

    const otpHtml = `
      <div style="text-align: center;">
        <h2 style="color: #333;">Verify Your Email</h2>
        <p>Welcome to My Drive! Please enter this code to complete your registration:</p>
        
        <div style="background-color: #f0f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">
                ${otp}
            </span>
        </div>
        
        <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
      </div>
    `;

    await sendEmail(
        username, 
        "Verify your account",
        `Your verification code is ${otp}`,
        otpHtml
    );

    res.json({ 
        message: "OTP sent", 
        mfaRequired: true, 
        userId: newUser._id 
    });

  } catch (err) { 
      console.error(err);
      res.status(500).send(err.message); 
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ user: { id: user.id } }, JWT_SECRET, { expiresIn: '1h' });
    const userObj = user.toObject();

    res.json({ 
        token, 
        user: { 
            id: userObj._id,
            username: userObj.username,
            name: userObj.name,
            age: userObj.age,
            phone: userObj.phone,
            isProfileSetup: userObj.isProfileSetup
        } 
    });
  } catch (err) { res.status(500).send(err.message); }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { userId, otp } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(400).json({ msg: "User not found" });

        if (!user.otp || user.otp !== otp) {
            return res.status(400).json({ msg: "Invalid Code" });
        }
        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ msg: "Code expired" });
        }

        user.otp = null;
        user.otpExpires = null;
        await user.save();

        const token = jwt.sign({ user: { id: user.id } }, JWT_SECRET, { expiresIn: '1h' });
        const userObj = user.toObject();

        res.json({ 
            token, 
            user: { 
                id: userObj._id,
                username: userObj.username,
                name: userObj.name,
                age: userObj.age,
                phone: userObj.phone,
                isProfileSetup: userObj.isProfileSetup
            } 
        });
    } catch (err) { res.status(500).send(err.message); }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, age, phone } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.name = name;
    user.age = age;
    
    user.phone = phone; 
    
    user.isProfileSetup = true; 

    await user.save();

    res.json({ 
        user: { 
            id: user._id, 
            username: user.username, 
            name: user.name,
            age: user.age,
            phone: user.phone,
            isProfileSetup: user.isProfileSetup 
        } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};