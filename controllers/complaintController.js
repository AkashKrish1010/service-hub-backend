const Complaint = require('../models/Complaint');

// @desc    File a new complaint
// @route   POST /api/complaints
// @access  Private (Customer)
exports.createComplaint = async (req, res, next) => {
  try {
    const { bookingId, subject, description } = req.body;
    const complaint = await Complaint.create({
      userId: req.user.id,
      bookingId,
      subject,
      description,
      status: 'open',
    });
    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

// @desc    Get customer complaints
// @route   GET /api/complaints/my
// @access  Private (Customer)
exports.getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ userId: req.user.id })
      .populate('bookingId')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: complaints.length, data: complaints });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all complaints (Admin)
// @route   GET /api/complaints
// @access  Private (Admin only)
exports.getAllComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find()
      .populate('userId', 'name email phone')
      .populate('bookingId')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: complaints.length, data: complaints });
  } catch (err) {
    next(err);
  }
};

// @desc    Resolve complaint (Admin)
// @route   PUT /api/complaints/:id
// @access  Private (Admin only)
exports.resolveComplaint = async (req, res, next) => {
  try {
    const { status, adminResponse } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status: status || 'resolved', adminResponse },
      { new: true, runValidators: true }
    );

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};
