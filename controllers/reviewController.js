const Review = require('../models/Review');
const ProviderProfile = require('../models/ProviderProfile');
const Booking = require('../models/Booking');

// @desc    Create review for completed booking
// @route   POST /api/reviews
// @access  Private (Customer)
exports.createReview = async (req, res, next) => {
  try {
    const { bookingId, providerId, rating, reviewText, serviceQuality, providerBehavior } = req.body;

    // Resolve the actual provider user ID
    let targetProviderId = providerId;

    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (booking && booking.providerId) {
        targetProviderId = booking.providerId;
      }
    }

    if (targetProviderId) {
      // Check if targetProviderId is a ProviderProfile _id
      const profileById = await ProviderProfile.findById(targetProviderId);
      if (profileById) {
        targetProviderId = profileById.userId;
      }
    }

    const review = await Review.create({
      bookingId,
      customerId: req.user.id,
      providerId: targetProviderId,
      rating: Number(rating),
      reviewText,
      serviceQuality: serviceQuality || 5,
      providerBehavior: providerBehavior || 5,
    });

    // Recalculate provider average rating across ALL reviews for this provider
    const reviews = await Review.find({ providerId: targetProviderId });
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const roundedRating = Math.round(avg * 10) / 10;

    await ProviderProfile.findOneAndUpdate(
      { $or: [{ userId: targetProviderId }, { _id: targetProviderId }] },
      {
        averageRating: roundedRating,
        totalReviews: reviews.length,
      },
      { new: true }
    );

    res.status(201).json({ success: true, data: review, newRating: roundedRating });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all reviews for a provider
// @route   GET /api/reviews/provider/:id
// @access  Public
exports.getProviderReviews = async (req, res, next) => {
  try {
    let targetId = req.params.id;
    const profile = await ProviderProfile.findById(targetId);
    if (profile) {
      targetId = profile.userId;
    }

    const reviews = await Review.find({
      $or: [{ providerId: targetId }, { providerId: req.params.id }],
    })
      .populate('customerId', 'name profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all reviews across the platform (for admin moderation)
// @route   GET /api/reviews
// @access  Private (Admin)
exports.getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate('customerId', 'name email profileImage')
      .populate('providerId', 'name email profileImage')
      .populate('bookingId', 'categoryName scheduledDate totalAmount status')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete inappropriate review and recalculate provider rating
// @route   DELETE /api/reviews/:id
// @access  Private (Admin)
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const providerId = review.providerId;

    await Review.findByIdAndDelete(req.params.id);

    // Recalculate remaining reviews for this provider
    const remainingReviews = await Review.find({ providerId });
    const avg = remainingReviews.length > 0
      ? Math.round((remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length) * 10) / 10
      : 5.0;

    await ProviderProfile.findOneAndUpdate(
      { $or: [{ userId: providerId }, { _id: providerId }] },
      {
        averageRating: avg,
        totalReviews: remainingReviews.length,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Inappropriate review deleted successfully.',
      newRating: avg,
      remainingReviewsCount: remainingReviews.length,
    });
  } catch (err) {
    next(err);
  }
};

