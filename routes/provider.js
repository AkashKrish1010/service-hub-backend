const express = require('express');
const {
  updateProfile,
  getProfileById,
  saveLocation,
  getNearbyProviders,
  getDashboardStats,
  getEarnings,
} = require('../controllers/providerController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getNearbyProviders);
router.get('/nearby', getNearbyProviders);
router.get('/profile/:id', getProfileById);

// Protected routes for providers
router.post('/profile', protect, authorize('provider'), updateProfile);
router.put('/profile', protect, authorize('provider'), updateProfile);
router.post('/location', protect, authorize('provider'), saveLocation);
router.get('/dashboard-stats', protect, authorize('provider'), getDashboardStats);
router.get('/earnings', protect, authorize('provider'), getEarnings);

// Parameterized route must be at the very bottom
router.get('/:id', getProfileById);

module.exports = router;
