const express = require('express');
const {
  createBooking,
  getCustomerBookings,
  getProviderBookings,
  updateBookingStatus,
  getBookingById,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', authorize('customer'), createBooking);
router.get('/my', authorize('customer'), getCustomerBookings);
router.get('/provider', authorize('provider'), getProviderBookings);
router.put('/:id/status', updateBookingStatus);
router.get('/:id', getBookingById);

module.exports = router;
