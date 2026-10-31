const mongoose = require('mongoose');

const ServiceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add category name'],
      unique: true,
      trim: true,
    },
    icon: {
      type: String, // Lucide icon name, e.g. "wrench", "zap", "sparkles", "hammer" - strictly no emoji
      required: true,
      default: 'wrench',
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ServiceCategory', ServiceCategorySchema);
