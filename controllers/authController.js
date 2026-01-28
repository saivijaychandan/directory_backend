const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET;
const internalKey = process.env.INTERNAL_API_KEY;

const sendOtpAndResponse = async (user, res) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; 
    await user.save(); 

    const otpHtml = `... your html string ...`;

    res.json({ 
        message: "OTP sent", 
        mfaRequired: true, 
        userId: user._id 
    });
    const emailServiceUrl = process.env.EMAIL_SERVICE_URL + '/send'; 

    axios.post(emailServiceUrl, {
        to: user.username,
        subject: "Verify your account",
        text: `Your verification code is ${otp}`,
        extraHtml: otpHtml
    },{
        headers: { 'x-internal-secret': internalKey } 
    })
    .then(response => {
        console.log("Microservice accepted the email request.");
    })
    .catch(error => {
        console.error("FAILED to talk to Email Service:", error.message);
    });
};

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ username });
    
    if (existingUser) {
        if (existingUser.otp) {
            const salt = await bcrypt.genSalt(10);
            existingUser.password = await bcrypt.hash(password, salt);
            
            return await sendOtpAndResponse(existingUser, res);
        }
        
        return res.status(400).json({ msg: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new User({ 
      username, 
      password: hashedPassword 
    });

    await sendOtpAndResponse(newUser, res);

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

    if (user.otp) return res.status(400).json({ msg: "Please verify your email first." });

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

exports.forgotPassword = async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) return res.status(404).json({ msg: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const emailHtml = `
      <div style="text-align: center;">
        <h2 style="color: #333;">Reset Password</h2>
        <p>You requested to reset your password. Use the code below:</p>
        <div style="background-color: #f0f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 14px;">If you didn't request this, ignore this email.</p>
      </div>
    `;

    res.json({ message: "OTP sent to email" });

    const emailServiceUrl = process.env.EMAIL_SERVICE_URL + '/send';
    
    axios.post(emailServiceUrl, {
        to: user.username,
        subject: "Reset Password Code",
        text: `Code: ${otp}`,
        extraHtml: emailHtml
    },{
        headers: { 'x-internal-secret': internalKey } 
    })
    .catch(err => {
        console.error("Failed to send Password Reset Email:", err.message);
    });

  } catch (err) {
      console.error(err);
      if (!res.headersSent) res.status(500).send(err.message); 
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { username, otp, newPassword } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (!user.otp || user.otp !== otp) {
        return res.status(400).json({ msg: "Invalid OTP" });
    }
    if (user.otpExpires < Date.now()) {
        return res.status(400).json({ msg: "OTP expired" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) { res.status(500).send(err.message); }
};