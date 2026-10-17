const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

// Overview stats
router.get('/metrics', analyticsController.getGlobalMetrics);

// PPT SQL Use Cases
router.get('/top-engagement', analyticsController.getTopPromptsByEngagement); // PPT Use Case 1
router.get('/active-creators', analyticsController.getMostActiveCreators); // PPT Use Case 2
router.get('/filter-multi', analyticsController.getPromptsFilteredMulti); // PPT Use Case 3
router.get('/most-bookmarks', analyticsController.getUsersWithMostBookmarks); // PPT Use Case 4
router.get('/rating-by-category', analyticsController.getAvgRatingByCategory); // PPT Use Case 5
router.get('/monthly-trend', analyticsController.getMonthlyCreationTrend); // PPT Use Case 6

// Additional distributions
router.get('/by-model', analyticsController.getPromptsByModel);

module.exports = router;
