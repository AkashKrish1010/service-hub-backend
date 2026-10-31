const ProviderProfile = require('../models/ProviderProfile');
const Booking = require('../models/Booking');
const User = require('../models/User');

// @desc    Create or update provider profile
// @route   POST /api/provider/profile, PUT /api/provider/profile
// @access  Private (Provider only)
exports.updateProfile = async (req, res, next) => {
  try {
    const {
      category,
      bio,
      experience,
      qualifications,
      hourlyRate,
      workImages,
      workingHours,
      isAvailable,
      location,
    } = req.body;

    const profileFields = {
      userId: req.user.id,
      ...(category && { category }),
      ...(bio !== undefined && { bio }),
      ...(experience && { experience }),
      ...(qualifications && { qualifications }),
      ...(hourlyRate && { hourlyRate: Number(hourlyRate) }),
      ...(workImages && { workImages }),
      ...(workingHours && { workingHours }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(location && { location }),
    };

    if (req.body.profileImage !== undefined) {
      await User.findByIdAndUpdate(req.user.id, { profileImage: req.body.profileImage });
    }

    let profile = await ProviderProfile.findOne({ userId: req.user.id });

    if (profile) {
      profile = await ProviderProfile.findOneAndUpdate(
        { userId: req.user.id },
        { $set: profileFields },
        { new: true, runValidators: true }
      ).populate('userId', 'name email phone profileImage isVerified isApproved');
    } else {
      profile = await ProviderProfile.create(profileFields);
      profile = await profile.populate('userId', 'name email phone profileImage isVerified isApproved');
    }

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

// @desc    Get provider profile by ID
// @route   GET /api/provider/profile/:id
// @access  Public
exports.getProfileById = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Invalid provider identifier.',
      });
    }

    const profile = await ProviderProfile.findOne({
      $or: [{ _id: id }, { userId: id }],
    }).populate('userId', 'name email phone profileImage isVerified isApproved');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found.',
      });
    }

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

// @desc    Save provider location (lat/lng pin)
// @route   POST /api/provider/location
// @access  Private (Provider only)
exports.saveLocation = async (req, res, next) => {
  try {
    const { lat, lng, address } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both latitude and longitude.',
      });
    }

    const location = {
      type: 'Point',
      coordinates: [parseFloat(lng), parseFloat(lat)], // GeoJSON format: [longitude, latitude]
      address: address || 'Service Location',
    };

    const profile = await ProviderProfile.findOneAndUpdate(
      { userId: req.user.id },
      { location },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Location pinned successfully.',
      data: profile.location,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get nearby providers (Geospatial query)
// @route   GET /api/provider/nearby?lat=&lng=&radius=&category=
// @access  Public
exports.getNearbyProviders = async (req, res, next) => {
  try {
    const { lat, lng, radius = 25, category } = req.query;

    const query = { isAvailable: true };

    if (category && category !== 'All') {
      query.category = new RegExp(category, 'i');
    }

    // Only approved providers
    const approvedUsers = await User.find({ role: 'provider', isApproved: true }).select('_id');
    const approvedUserIds = approvedUsers.map((u) => u._id);
    query.userId = { $in: approvedUserIds };

    let providers;

    if (lat && lng) {
      const maxDistanceMeters = parseFloat(radius) * 1000; // km to meters
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: maxDistanceMeters,
        },
      };

      providers = await ProviderProfile.find(query)
        .populate('userId', 'name email phone profileImage isVerified isApproved')
        .limit(30);
    } else {
      // Fallback if coordinates are not sent
      providers = await ProviderProfile.find(query)
        .populate('userId', 'name email phone profileImage isVerified isApproved')
        .limit(30);
    }

    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get provider dashboard statistics
// @route   GET /api/provider/dashboard-stats
// @access  Private (Provider only)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const providerId = req.user.id;

    const [totalBookings, activeBookings, completedBookings, profile] = await Promise.all([
      Booking.countDocuments({ providerId }),
      Booking.countDocuments({ providerId, status: { $in: ['accepted', 'ongoing'] } }),
      Booking.countDocuments({ providerId, status: 'completed' }),
      ProviderProfile.findOne({ userId: providerId }),
    ]);

    const completedList = await Booking.find({ providerId, status: 'completed' });
    const totalEarnings = completedList.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

    const pendingList = await Booking.find({ providerId, status: 'pending' });

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        activeBookings,
        completedBookings,
        pendingBookingsCount: pendingList.length,
        totalEarnings: totalEarnings || (profile ? profile.totalEarnings : 0),
        averageRating: profile ? profile.averageRating : 4.8,
        totalReviews: profile ? profile.totalReviews : 0,
        isAvailable: profile ? profile.isAvailable : true,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get provider earnings breakdown
// @route   GET /api/provider/earnings
// @access  Private (Provider only)
exports.getEarnings = async (req, res, next) => {
  try {
    const providerId = req.user.id;
    const completedBookings = await Booking.find({
      providerId,
      status: 'completed',
    }).sort({ createdAt: -1 });

    const total = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    // Calculate this month's earnings
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthBookings = completedBookings.filter(
      (b) => new Date(b.createdAt) >= firstDayOfMonth
    );
    const monthly = thisMonthBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const ongoingBookings = await Booking.find({
      providerId,
      status: { $in: ['accepted', 'ongoing'] },
    });
    const pending = ongoingBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        totalEarnings: total,
        monthlyEarnings: monthly,
        pendingEarnings: pending,
        completedJobsCount: completedBookings.length,
        recentPayouts: completedBookings.slice(0, 10).map((b) => ({
          bookingId: b._id,
          amount: b.totalAmount,
          date: b.scheduledDate || b.createdAt,
          customerName: b.customerId ? b.customerId.name : 'Customer',
          status: 'Paid',
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};
