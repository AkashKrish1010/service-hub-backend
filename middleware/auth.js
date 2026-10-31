const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes via session token
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Please sign in to continue.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'service_hub_super_secret_jwt_key_2026_xyz');
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Account session expired. Please sign in again.',
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Session expired. Please sign in again.',
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this section.',
      });
    }
    next();
  };
};
