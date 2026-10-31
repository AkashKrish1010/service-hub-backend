const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const ProviderProfile = require('../models/ProviderProfile');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private (Customer)
exports.createBooking = async (req, res, next) => {
  try {
    const {
      providerId,
      categoryId,
      categoryName,
      serviceAddress,
      scheduledDate,
      scheduledTime,
      description,
      paymentMethod,
      totalAmount,
    } = req.body;

    const resolvedAddress = (serviceAddress || req.body.address || req.body.location?.address || '').trim();
    if (!resolvedAddress) {
      return res.status(400).json({ success: false, message: 'Please provide service address' });
    }

    let targetProviderUserId = providerId;
    if (providerId) {
      const profile = await ProviderProfile.findById(providerId).catch(() => null);
      if (profile && profile.userId) {
        targetProviderUserId = profile.userId;
      }
    }

    const resolvedPaymentMethod = (paymentMethod === 'card' || paymentMethod === 'online') ? 'online' : 'cash';
    const resolvedTotal = Number(totalAmount) || (req.body.hourlyRate ? Number(req.body.hourlyRate) * (req.body.estimatedHours || 2) : 40.0);

    const booking = await Booking.create({
      customerId: req.user.id,
      providerId: targetProviderUserId,
      categoryId,
      categoryName: categoryName || 'Home Service',
      serviceAddress: resolvedAddress,
      scheduledDate,
      scheduledTime,
      description,
      paymentMethod: resolvedPaymentMethod,
      paymentStatus: resolvedPaymentMethod === 'online' ? 'paid' : 'pending',
      totalAmount: resolvedTotal,
      status: 'pending',
    });

    const populatedBooking = await booking.populate([
      { path: 'customerId', select: 'name email phone profileImage' },
      { path: 'providerId', select: 'name email phone profileImage' },
    ]);

    // Create notification for the provider
    const notif = await Notification.create({
      userId: targetProviderUserId,
      title: 'New Booking Request',
      message: `You have a new booking request from ${req.user.name} for ${scheduledDate} at ${scheduledTime}.`,
      type: 'booking',
      referenceId: booking._id.toString(),
    });

    // Real-time Socket.io notification
    const io = req.app.get('io');
    if (io) {
      io.to(providerId.toString()).emit('new_booking_request', {
        booking: populatedBooking,
        notification: notif,
      });
    }

    res.status(201).json({ success: true, data: populatedBooking });
  } catch (err) {
    next(err);
  }
};

// @desc    Get customer bookings
// @route   GET /api/bookings/my
// @access  Private (Customer)
exports.getCustomerBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { customerId: req.user.id };

    if (status && status !== 'all') {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('providerId', 'name email phone profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    next(err);
  }
};

// @desc    Get provider bookings
// @route   GET /api/bookings/provider
// @access  Private (Provider)
exports.getProviderBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { providerId: req.user.id };

    if (status && status !== 'all') {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('customerId', 'name email phone profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    next(err);
  }
};

// @desc    Update booking status (accept, reject, complete, cancel)
// @route   PUT /api/bookings/:id/status
// @access  Private
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status, completionPhoto, completionReason } = req.body;
    const validStatuses = ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = status;

    if (status === 'completed') {
      booking.paymentStatus = 'paid';
      if (completionPhoto || completionReason) {
        booking.completionProof = {
          photoUrl: completionPhoto || '',
          reason: completionReason || '',
          completedAt: new Date(),
        };
      }
      // Update provider profile total earnings
      await ProviderProfile.findOneAndUpdate(
        { userId: booking.providerId },
        { $inc: { totalEarnings: booking.totalAmount || 0 } }
      );
    }

    await booking.save();

    const populatedBooking = await booking.populate([
      { path: 'customerId', select: 'name email phone profileImage' },
      { path: 'providerId', select: 'name email phone profileImage' },
    ]);

    // Send notification to customer
    const notifMessageMap = {
      accepted: 'Your booking has been accepted by the service provider!',
      ongoing: 'The service provider has started work on your job.',
      completed: 'Your service has been marked completed. Please leave a review!',
      cancelled: 'Your booking was cancelled.',
    };

    if (notifMessageMap[status]) {
      const notif = await Notification.create({
        userId: booking.customerId,
        title: `Booking ${status.toUpperCase()}`,
        message: notifMessageMap[status],
        type: 'booking',
        referenceId: booking._id.toString(),
      });

      const io = req.app.get('io');
      if (io) {
        io.to(booking.customerId.toString()).emit('booking_status_updated', {
          booking: populatedBooking,
          notification: notif,
        });
      }
    }

    res.status(200).json({ success: true, data: populatedBooking });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single booking details
// @route   GET /api/bookings/:id
// @access  Private
exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate([
      { path: 'customerId', select: 'name email phone profileImage' },
      { path: 'providerId', select: 'name email phone profileImage' },
    ]);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};
