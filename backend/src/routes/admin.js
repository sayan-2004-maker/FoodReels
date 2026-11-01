const express = require('express');
const User = require('../models/User');
const Reel = require('../models/Reel');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Category = require('../models/Category');
const Restaurant = require('../models/Restaurant');
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const router = express.Router();
router.use(auth, admin);
router.get('/analytics', async (req, res) => {
  try {
    const [users, reels, likes, comments, views, popularCreators, trendingCategories, dailyUploads] = await Promise.all([
      User.countDocuments(), Reel.countDocuments({ status: 'published' }), Like.countDocuments(), Comment.countDocuments(),
      Reel.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }]),
      Reel.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$author', reels: { $sum: 1 }, likes: { $sum: '$likeCount' }, views: { $sum: '$viewCount' } } }, { $sort: { likes: -1, views: -1 } }, { $limit: 8 }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'creator' } }]),
      Reel.aggregate([{ $match: { category: { $ne: null } } }, { $group: { _id: '$category', reels: { $sum: 1 }, views: { $sum: '$viewCount' } } }, { $sort: { views: -1 } }, { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } }]),
      Reel.aggregate([{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, uploads: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 14 }])
    ]);
    res.json({ totals: { users, reels, likes, comments, views: views[0]?.total || 0 }, popularCreators, trendingCategories, dailyUploads });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
router.get('/content', async (req, res) => { try { const [users, reels, comments, categories, restaurants, reports] = await Promise.all([User.find().select('name username email role createdAt').limit(100), Reel.find().populate('author', 'username name').sort({ createdAt: -1 }).limit(100), Comment.find().populate('author', 'username').sort({ createdAt: -1 }).limit(100), Category.find(), Restaurant.find(), Report.find({ status: 'open' })]); res.json({ users, reels, comments, categories, restaurants, reports }); } catch (error) { res.status(500).json({ message: error.message }); } });
router.patch('/reels/:id/status', async (req, res) => { try { const reel = await Reel.findByIdAndUpdate(req.params.id, { status: req.body.status === 'removed' ? 'removed' : 'published' }, { new: true }); if (!reel) return res.status(404).json({ message: 'Reel not found' }); res.json({ reel }); } catch (error) { res.status(400).json({ message: error.message }); } });
module.exports = router;
