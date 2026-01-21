const jwt = require('jsonwebtoken');

const JWT_SECRET = "my_super_secret_key_123"; 

module.exports = function(req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
    const decoded = jwt.verify(tokenString, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};