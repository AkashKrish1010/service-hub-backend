const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const Booking = require('../models/Booking');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');

// @desc    Admin overview dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalProviders,
      pendingProviders,
      totalBookings,
      activeBookings,
      openComplaints,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'provider' }),
      User.countDocuments({ role: 'provider', isApproved: false }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: { $in: ['accepted', 'ongoing'] } }),
      Complaint.countDocuments({ status: 'open' }),
    ]);

    const completedBookings = await Booking.find({ status: 'completed' });
    const grossRevenue = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const platformCommission = Math.round(grossRevenue * 0.15 * 100) / 100; // 15% platform commission

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalCustomers,
        totalProviders,
        pendingProviders,
        totalBookings,
        activeBookings,
        completedBookings: completedBookings.length,
        openComplaints,
        grossRevenue,
        platformCommission,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const query = {};
    if (role) query.role = role;

    const users = await User.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user status / verification
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { isVerified } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified },
      { new: true }
    );
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// @desc    Get providers list with profiles
// @route   GET /api/admin/providers
// @access  Private (Admin only)
exports.getProviders = async (req, res, next) => {
  try {
    const { isApproved } = req.query;
    const userQuery = { role: 'provider' };
    if (isApproved !== undefined) {
      userQuery.isApproved = isApproved === 'true';
    }

    const providerUsers = await User.find(userQuery).sort({ createdAt: -1 });
    const userIds = providerUsers.map((u) => u._id);

    const profiles = await ProviderProfile.find({ userId: { $in: userIds } });
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.userId.toString()] = p;
    });

    const result = providerUsers.map((u) => ({
      user: u,
      profile: profileMap[u._id.toString()] || null,
    }));

    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve or reject provider
// @route   PUT /api/admin/providers/:id/approve
// @access  Private (Admin only)
exports.approveOrRejectProvider = async (req, res, next) => {
  try {
    const { isApproved } = req.body; // true or false
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: Boolean(isApproved) },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Provider user not found' });
    }

    // Update provider profile availability
    await ProviderProfile.findOneAndUpdate(
      { userId: user._id },
      { isAvailable: Boolean(isApproved) }
    );

    // Send notification to provider
    await Notification.create({
      userId: user._id,
      title: isApproved ? 'Profile Approved!' : 'Profile Review Update',
      message: isApproved
        ? 'Congratulations! Your service provider profile has been approved. You can now receive customer bookings.'
        : 'Your service provider registration requires additional verification. Please contact support.',
      type: 'admin',
    });

    const io = req.app.get('io');
    if (io) {
      io.to(user._id.toString()).emit('user_updated', { isApproved: Boolean(isApproved) });
    }

    res.status(200).json({
      success: true,
      message: `Provider status updated to ${isApproved ? 'Approved' : 'Rejected'}`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all platform bookings overview
// @route   GET /api/admin/bookings
// @access  Private (Admin only)
exports.getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('customerId', 'name email phone')
      .populate('providerId', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    next(err);
  }
};

// @desc    Get analytics metrics
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
exports.getAnalytics = async (req, res, next) => {
  try {
    const bookings = await Booking.find();
    const categoriesCount = {};

    bookings.forEach((b) => {
      const cat = b.categoryName || 'Other';
      categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
    });

    const categoryBreakdown = Object.keys(categoriesCount).map((name) => ({
      category: name,
      count: categoriesCount[name],
    }));

    res.status(200).json({
      success: true,
      data: {
        totalBookings: bookings.length,
        completionRate: bookings.length
          ? Math.round(
              (bookings.filter((b) => b.status === 'completed').length / bookings.length) * 100
            )
          : 92,
        categoryBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};
