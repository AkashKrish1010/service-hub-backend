const Review = require('../models/Review');
const ProviderProfile = require('../models/ProviderProfile');
const Booking = require('../models/Booking');

// Helper to compute natural language sentiment analysis percentage & label
const calculateReviewSentiment = (rating, text = '', serviceQuality = 5, providerBehavior = 5) => {
  const baseScores = { 5: 88, 4: 75, 3: 55, 2: 35, 1: 15 };
  let score = baseScores[Math.round(Number(rating))] || 75;

  const cleanText = (text || '').toLowerCase();

  const positiveWords = [
    'great', 'excellent', 'amazing', 'perfect', 'swiftly', 'clean', 'spotless',
    'friendly', 'fast', 'sturdy', 'recommend', 'punctual', 'professional',
    'master', 'love', 'helpful', 'thorough', 'quick', 'skilled', 'awesome',
    'polite', 'best', 'wonderful', 'satisfied', 'neat', 'superb', 'prompt',
    'efficient', 'careful', 'expert', 'flawless', 'reliable', 'honest'
  ];

  const negativeWords = [
    'bad', 'terrible', 'horrible', 'poor', 'leak', 'slow', 'late', 'dirty',
    'rude', 'unprofessional', 'worst', 'damage', 'waste', 'broken', 'scam',
    'unresponsive', 'overpriced', 'disaster', 'messy', 'careless', 'delay',
    'faulty', 'incomplete', 'arrogant', 'unpleasant'
  ];

  let positiveHits = 0;
  positiveWords.forEach((word) => {
    if (cleanText.includes(word)) positiveHits++;
  });

  let negativeHits = 0;
  negativeWords.forEach((word) => {
    if (cleanText.includes(word)) negativeHits++;
  });

  // Adjust score based on sentiment keywords
  score += Math.min(positiveHits * 3, 12);
  score -= Math.min(negativeHits * 6, 25);

  // Sub-rating adjustments
  const subAvg = (Number(serviceQuality || 5) + Number(providerBehavior || 5)) / 2;
  if (subAvg >= 4.5) score += 3;
  else if (subAvg < 3) score -= 5;

  // Clamp to [5, 100]
  score = Math.max(5, Math.min(100, Math.round(score)));

  let label = 'Positive';
  if (score < 50) label = 'Negative';
  else if (score < 75) label = 'Neutral';

  return { sentimentScore: score, sentimentLabel: label };
};

// Helper: Calculate aggregate sentiment statistics from a list of reviews
const aggregateSentimentStats = (reviews = []) => {
  if (!reviews || reviews.length === 0) {
    return {
      averagePercentage: 0,
      positivePercentage: 0,
      neutralPercentage: 0,
      negativePercentage: 0,
      label: 'New Provider',
      totalReviews: 0,
    };
  }

  const total = reviews.length;
  const sumScores = reviews.reduce((sum, r) => sum + (r.sentimentScore != null ? r.sentimentScore : 90), 0);
  const averagePercentage = Math.round(sumScores / total);

  const positiveCount = reviews.filter((r) => (r.sentimentLabel || 'Positive') === 'Positive').length;
  const neutralCount = reviews.filter((r) => r.sentimentLabel === 'Neutral').length;
  const negativeCount = reviews.filter((r) => r.sentimentLabel === 'Negative').length;

  let label = 'Positive';
  if (averagePercentage < 50) label = 'Negative';
  else if (averagePercentage < 75) label = 'Neutral';

  return {
    averagePercentage,
    positivePercentage: Math.round((positiveCount / total) * 100),
    neutralPercentage: Math.round((neutralCount / total) * 100),
    negativePercentage: Math.round((negativeCount / total) * 100),
    label,
    totalReviews: total,
  };
};

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

    // Compute sentiment analysis
    const { sentimentScore, sentimentLabel } = calculateReviewSentiment(
      rating,
      reviewText,
      serviceQuality,
      providerBehavior
    );

    const review = await Review.create({
      bookingId,
      customerId: req.user.id,
      providerId: targetProviderId,
      rating: Number(rating),
      reviewText,
      serviceQuality: serviceQuality || 5,
      providerBehavior: providerBehavior || 5,
      sentimentScore,
      sentimentLabel,
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

    const sentimentStats = aggregateSentimentStats(reviews);

    res.status(201).json({
      success: true,
      data: review,
      newRating: roundedRating,
      sentiment: sentimentStats,
    });
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

    const sentimentStats = aggregateSentimentStats(reviews);

    res.status(200).json({
      success: true,
      count: reviews.length,
      sentiment: sentimentStats,
      data: reviews,
    });
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

