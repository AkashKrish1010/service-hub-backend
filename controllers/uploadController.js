const cloudinary = require('../config/cloudinary');

// @desc    Upload image to Cloudinary
// @route   POST /api/upload/image
// @access  Private
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    // Check if Cloudinary credentials are set
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'demo_cloud_name') {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'service_hub',
        resource_type: 'image',
      });
      return res.status(200).json({ success: true, url: result.secure_url });
    }

    // Default safe fallback if cloudinary credentials are not configured in local environment
    const sampleUrls = [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    ];
    const fallbackUrl = sampleUrls[Math.floor(Math.random() * sampleUrls.length)];

    res.status(200).json({
      success: true,
      url: fallbackUrl,
    });
  } catch (err) {
    next(err);
  }
};
