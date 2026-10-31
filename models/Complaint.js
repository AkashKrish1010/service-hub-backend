const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    subject: {
      type: String,
      required: [true, 'Please provide a subject for your complaint'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide details of your complaint'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_review', 'resolved'],
      default: 'open',
    },
    adminResponse: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Complaint', ComplaintSchema);
