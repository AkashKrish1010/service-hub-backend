const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
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
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
    },
    categoryName: {
      type: String,
      default: 'General Service',
    },
    serviceAddress: {
      type: String,
      required: [true, 'Please provide service address'],
      trim: true,
    },
    scheduledDate: {
      type: String, // e.g. "2026-10-29"
      required: [true, 'Please select a date'],
    },
    scheduledTime: {
      type: String, // e.g. "11:30 AM"
      required: [true, 'Please select a time slot'],
    },
    description: {
      type: String,
      required: [true, 'Please describe your service need'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'cash'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 40.0,
    },
    receipt: {
      receiptNumber: { type: String, default: () => 'SH-' + Date.now().toString().slice(-6) },
      tax: { type: Number, default: 4.0 },
      platformFee: { type: Number, default: 2.0 },
      issuedAt: { type: Date, default: Date.now },
    },
    completionProof: {
      photoUrl: { type: String, default: '' },
      reason: { type: String, default: '' },
      completedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Booking', BookingSchema);
