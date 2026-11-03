const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const jwt = require('jsonwebtoken');

// Helper to sign JWT token
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET || 'service_hub_super_secret_jwt_key_2026_xyz',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      profileImage: user.profileImage || '',
      isVerified: user.isVerified,
      isApproved: user.isApproved,
    },
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedName = (name || '').trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const assignedRole = ['customer', 'provider', 'admin'].includes(role)
      ? role
      : 'customer';

    const isProvider = assignedRole === 'provider';
    const user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password,
      phone: phone || '',
      role: assignedRole,
      isApproved: isProvider ? false : true, // Providers MUST be approved by admin before active dispatch
      isVerified: true,
      profileImage: '', // Always default to icon for all new accounts!
    });

    // If role is provider, initialize default provider profile
    if (isProvider) {
      const selectedCategory = (req.body.category || 'General Services').trim();
      const coords = req.body.lng && req.body.lat ? [Number(req.body.lng), Number(req.body.lat)] : [80.2337, 13.0418];
      await ProviderProfile.create({
        userId: user._id,
        category: selectedCategory,
        bio: (req.body.bio || `Certified ${selectedCategory} technician providing high quality repairs.`).trim(),
        experience: req.body.experience || '1+ years',
        hourlyRate: Number(req.body.hourlyRate) || 40,
        averageRating: 0,
        totalReviews: 0,
        totalEarnings: 0,
        isAvailable: false,
        location: {
          type: 'Point',
          coordinates: coords,
          address: req.body.address || 'Chennai, Tamil Nadu',
        },
        workingHours: { open: '08:00 AM', close: '07:00 PM', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
      });
    }

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user (supports email or name, auto-registers new login with provided name)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password, role, name } = req.body;
    const identifier = (email || name || req.body.identifier || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your name/email and password.',
      });
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    let user;

    if (isEmail) {
      user = await User.findOne({ email: identifier.toLowerCase() }).select('+password');
    } else {
      // Find by exact name (case-insensitive) OR fallback matching email
      user = await User.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { email: identifier.toLowerCase() },
        ],
      }).select('+password');
    }

    // Role-aware validation if role is specified and user exists
    if (user && role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Account found, but registered as '${user.role}' instead of '${role}'. Please switch role to proceed.`,
      });
    }

    // If user does not exist, auto-create this NEW LOGIN so whatever name is provided becomes their profile name!
    if (!user) {
      const assignedRole = ['customer', 'provider', 'admin'].includes(role) ? role : 'customer';

      let displayName = (name || '').trim();
      if (!displayName) {
        if (isEmail) {
          const raw = identifier.split('@')[0];
          displayName = raw.charAt(0).toUpperCase() + raw.slice(1);
        } else {
          displayName = identifier;
        }
      }

      let userEmail = isEmail ? identifier.toLowerCase() : '';
      if (!userEmail) {
        const sanitized = identifier.toLowerCase().replace(/[^a-z0-9]/g, '');
        const baseEmail = `${sanitized || 'user'}@servicehub.com`;
        const exists = await User.findOne({ email: baseEmail });
        userEmail = exists
          ? `${sanitized || 'user'}_${Date.now().toString().slice(-4)}@servicehub.com`
          : baseEmail;
      }

      const isProvider = assignedRole === 'provider';
      user = await User.create({
        name: displayName,
        email: userEmail,
        password: password,
        phone: '',
        role: assignedRole,
        isApproved: isProvider ? false : true, // Providers must wait for admin approval
        isVerified: true,
        profileImage: '', // Always default to icon for all new accounts!
      });

      if (isProvider) {
        const selectedCategory = (req.body.category || 'General Services').trim();
        await ProviderProfile.create({
          userId: user._id,
          category: selectedCategory,
          bio: `Certified ${selectedCategory} technician.`,
          experience: '1+ years',
          hourlyRate: 40,
          averageRating: 0,
          totalReviews: 0,
          totalEarnings: 0,
          isAvailable: false,
          location: {
            type: 'Point',
            coordinates: [80.2337, 13.0418],
            address: 'Chennai, Tamil Nadu',
          },
          workingHours: { open: '08:00 AM', close: '07:00 PM', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
        });
      }

      return sendTokenResponse(user, 201, res);
    }

    // Verify password for existing user
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    // If an explicit custom name was passed during login, ensure the user name is updated to it
    if (name && name.trim() && user.name !== name.trim()) {
      user.name = name.trim();
      await user.save();
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let providerProfile = null;
    if (user.role === 'provider') {
      providerProfile = await ProviderProfile.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        profileImage: user.profileImage || '',
        isVerified: user.isVerified,
        isApproved: user.isApproved,
        address: user.address || '',
        providerProfile,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Log user out
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current password and new password.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Update profile (name, phone, profileImage)
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, profileImage, address } = req.body;
    const fieldsToUpdate = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (phone !== undefined) fieldsToUpdate.phone = phone;
    if (profileImage !== undefined) fieldsToUpdate.profileImage = profileImage;
    if (address !== undefined) fieldsToUpdate.address = address;

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};


