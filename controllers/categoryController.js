const ServiceCategory = require('../models/ServiceCategory');

// @desc    Get all active service categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await ServiceCategory.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (err) {
    next(err);
  }
};

// @desc    Create service category
// @route   POST /api/categories
// @access  Private (Admin only)
exports.createCategory = async (req, res, next) => {
  try {
    const { name, icon, description } = req.body;
    const category = await ServiceCategory.create({ name, icon, description });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// @desc    Update service category
// @route   PUT /api/categories/:id
// @access  Private (Admin only)
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await ServiceCategory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete service category
// @route   DELETE /api/categories/:id
// @access  Private (Admin only)
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await ServiceCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, message: 'Category removed' });
  } catch (err) {
    next(err);
  }
};
