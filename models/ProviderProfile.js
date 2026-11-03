const mongoose = require('mongoose');

const ProviderProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    category: {
      type: String,
      required: [true, 'Please select a service category'],
      trim: true,
    },
    bio: {
      type: String,
      default: '',
    },
    experience: {
      type: String,
      default: '1+ years',
    },
    qualifications: {
      type: [String],
      default: [],
    },
    hourlyRate: {
      type: Number,
      required: [true, 'Please specify your hourly rate'],
      default: 40,
    },
    workImages: {
      type: [String],
      default: [],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [80.2337, 13.0418], // Default Chennai Center
      },
      address: {
        type: String,
        default: 'Chennai, Tamil Nadu',
      },
    },
    workingHours: {
      open: { type: String, default: '08:00 AM' },
      close: { type: String, default: '07:00 PM' },
      days: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot be more than 5'],
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create 2dsphere index for location queries
ProviderProfileSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ProviderProfile', ProviderProfileSchema);
