const express = require('express');
const {
  recommendProviders,
  chatAssistant,
  descriptionHelper,
  profileSummary,
  adminRevenueInsights,
  providerPerformanceInsights,
} = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/recommend', recommendProviders);
router.post('/chat', chatAssistant);
router.post('/helper', descriptionHelper);
router.post('/summary', profileSummary);

// Protected Gemini AI Insights
router.get('/admin-revenue-insights', protect, authorize('admin'), adminRevenueInsights);
router.get('/provider-insights', protect, authorize('provider'), providerPerformanceInsights);

module.exports = router;
