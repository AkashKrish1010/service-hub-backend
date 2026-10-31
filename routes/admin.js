const express = require('express');
const {
  getAdminDashboard,
  getUsers,
  updateUserStatus,
  getProviders,
  approveOrRejectProvider,
  getAllBookings,
  getAnalytics,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getAdminDashboard);
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/providers', getProviders);
router.put('/providers/:id/approve', approveOrRejectProvider);
router.get('/bookings', getAllBookings);
router.get('/analytics', getAnalytics);

module.exports = router;
