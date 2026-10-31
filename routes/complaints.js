const express = require('express');
const {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  resolveComplaint,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.post('/', authorize('customer'), createComplaint);
router.get('/my', authorize('customer'), getMyComplaints);
router.get('/', authorize('admin'), getAllComplaints);
router.put('/:id', authorize('admin'), resolveComplaint);

module.exports = router;
