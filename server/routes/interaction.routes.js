const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interaction.controller');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Likes
router.post('/prompts/:id/like', authenticateToken, interactionController.toggleLike);

// Bookmarks
router.post('/prompts/:id/bookmark', authenticateToken, interactionController.toggleBookmark);
router.get('/bookmarks', authenticateToken, interactionController.getUserBookmarks);

// Ratings
router.post('/prompts/:id/rate', authenticateToken, interactionController.ratePrompt);

// Comments
router.get('/prompts/:id/comments', optionalAuth, interactionController.getComments);
router.post('/prompts/:id/comments', authenticateToken, interactionController.addComment);
router.delete('/comments/:id', authenticateToken, interactionController.deleteComment);

// Follows
router.post('/users/:userId/follow', authenticateToken, interactionController.toggleFollow);

module.exports = router;
