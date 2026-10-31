const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Please add a rating between 1 and 5'],
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
      required: [true, 'Please write a review comment'],
      trim: true,
    },
    serviceQuality: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
    providerBehavior: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Review', ReviewSchema);
