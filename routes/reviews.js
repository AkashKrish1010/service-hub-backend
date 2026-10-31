const express = require('express');
const {
  createReview,
  getProviderReviews,
  getAllReviews,
  deleteReview,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('admin'), getAllReviews);
router.get('/provider/:id', getProviderReviews);
router.post('/', protect, authorize('customer'), createReview);
router.delete('/:id', protect, authorize('admin'), deleteReview);

module.exports = router;
