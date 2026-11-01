const express = require('express');
const mongoose = require('mongoose');
const Reel = require('../models/Reel');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const Save = require('../models/Save');
const View = require('../models/View');
const Recipe = require('../models/Recipe');
const Category = require('../models/Category');
const Hashtag = require('../models/Hashtag');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const { reelCard } = require('../utils/serializers');
const router = express.Router();
const populated = query => query.populate('author', 'name username avatar bio location').populate('category', 'name slug icon').populate('hashtags', 'name usageCount').populate('restaurant', 'name location rating priceRange').populate('recipe');
const validId = id => mongoose.isValidObjectId(id);
const cleanTag = tag => String(tag || '').trim().replace(/^#/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
const media = value => typeof value === 'string' ? { url: value, provider: /^https?:/.test(value) ? 'external' : 'local' } : value;
async function tagsFrom(values) {
  const names = [...new Set((values || []).map(cleanTag).filter(Boolean))].slice(0, 12);
  return Promise.all(names.map(async name => (await Hashtag.findOneAndUpdate({ name }, { $setOnInsert: { name }, $inc: { usageCount: 1 } }, { upsert: true, new: true }))._id));
}
async function makeNotification(recipient, actor, type, reel, comment) {
  if (recipient && String(recipient) !== String(actor)) await Notification.create({ recipient, actor, type, reel, comment });
}

router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
    const filter = { status: 'published' };
    if (req.query.category && req.query.category !== 'all') { const cat = await Category.findOne({ $or: [{ slug: req.query.category }, { _id: validId(req.query.category) ? req.query.category : null }] }); if (!cat) return res.json({ reels: [], page, hasMore: false }); filter.category = cat._id; }
    if (req.query.hashtag) { const tag = await Hashtag.findOne({ name: cleanTag(req.query.hashtag) }); if (!tag) return res.json({ reels: [], page, hasMore: false }); filter.hashtags = tag._id; }
    if (req.query.q) { const re = new RegExp(String(req.query.q).slice(0, 80), 'i'); const tags = await Hashtag.find({ name: re }).select('_id'); filter.$or = [{ title: re }, { caption: re }, { 'location.name': re }, { 'location.city': re }, { hashtags: { $in: tags.map(t => t._id) } }]; }
    const sort = req.query.sort === 'popular' ? { likeCount: -1, viewCount: -1, createdAt: -1 } : { createdAt: -1 };
    const total = await Reel.countDocuments(filter);
    const records = await populated(Reel.find(filter).sort(sort).skip((page - 1) * limit).limit(limit));
    res.json({ reels: await Promise.all(records.map(r => reelCard(r, req.user?._id))), page, hasMore: page * limit < total });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/trending', optionalAuth, async (req, res) => {
  try { const records = await populated(Reel.find({ status: 'published' }).sort({ viewCount: -1, likeCount: -1 }).limit(18)); res.json({ reels: await Promise.all(records.map(r => reelCard(r, req.user?._id))) }); } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, caption = '', video, videoUrl, thumbnail, location = {}, categoryId, restaurantId, hashtags, recipe, audio = {} } = req.body;
    const clip = media(video || videoUrl);
    if (!title?.trim() || !clip?.url) return res.status(400).json({ message: 'A title and playable video are required' });
    if (title.trim().length > 120) return res.status(400).json({ message: 'Title must be 120 characters or fewer' });
    let category = null;
    if (categoryId) { if (!validId(categoryId) || !(category = await Category.findById(categoryId))) return res.status(400).json({ message: 'Choose a valid category' }); }
    let recipeId = null;
    if (recipe?.enabled) { const created = await Recipe.create({ title: recipe.title?.trim() || title.trim(), ingredients: (recipe.ingredients || []).filter(i => i?.name).slice(0, 30), instructions: (recipe.instructions || []).map(String).filter(Boolean).slice(0, 30), prepMinutes: Number(recipe.prepMinutes) || 0, cookMinutes: Number(recipe.cookMinutes) || 0, difficulty: recipe.difficulty || 'Easy', servings: Number(recipe.servings) || 1, location }); recipeId = created._id; }
    const reel = await Reel.create({ title: title.trim(), caption: String(caption).trim(), video: clip, thumbnail: thumbnail?.url ? media(thumbnail) : (typeof thumbnail === 'string' && thumbnail ? media(thumbnail) : null), location: { name: String(location.name || '').trim(), city: String(location.city || '').trim(), coordinates: Array.isArray(location.coordinates) ? location.coordinates : undefined }, category: category?._id, restaurant: validId(restaurantId) ? restaurantId : null, hashtags: await tagsFrom(hashtags), recipe: recipeId, audio: { name: String(audio.name || 'Original food audio').slice(0, 80), artist: String(audio.artist || '').slice(0, 80) }, author: req.user._id });
    const result = await populated(Reel.findById(reel._id));
    res.status(201).json({ reel: await reelCard(result, req.user._id) });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid reel id' });
    const comments = await Comment.find({ reel: req.params.id }).populate('author', 'name username avatar').sort({ createdAt: -1 }).lean();
    const mapComment = c => ({ id: c._id, text: c.text, createdAt: c.createdAt, author: c.author && { id: c.author._id, name: c.author.name, username: c.author.username, avatar: c.author.avatar }, likes: c.likes?.length || 0, liked: Boolean(req.user && c.likes?.some(id => String(id) === String(req.user._id))), replies: [] });
    const all = new Map(comments.map(c => [String(c._id), mapComment(c)])), roots = [];
    comments.forEach(c => c.parent && all.get(String(c.parent)) ? all.get(String(c.parent)).replies.push(all.get(String(c._id))) : roots.push(all.get(String(c._id))));
    res.json({ comments: roots });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/:id/comments', auth, async (req, res) => {
  try {
    const text = String(req.body.text || '').trim(), parentId = req.body.parentId;
    if (!text || text.length > 500) return res.status(400).json({ message: 'Comment must be between 1 and 500 characters' });
    const reel = await Reel.findById(req.params.id); if (!reel) return res.status(404).json({ message: 'Reel not found' });
    let parent = null; if (parentId) { parent = await Comment.findOne({ _id: parentId, reel: reel._id }); if (!parent) return res.status(400).json({ message: 'Reply target was not found' }); }
    const comment = await Comment.create({ reel: reel._id, author: req.user._id, text, parent: parent?._id || null });
    await Reel.updateOne({ _id: reel._id }, { $inc: { commentCount: 1 } });
    await makeNotification(parent ? parent.author : reel.author, req.user._id, parent ? 'reply' : 'comment', reel._id, comment._id);
    const doc = await comment.populate('author', 'name username avatar');
    res.status(201).json({ comment: { id: doc._id, text: doc.text, author: { id: doc.author._id, name: doc.author.name, username: doc.author.username, avatar: doc.author.avatar }, likes: 0, liked: false, replies: [], createdAt: doc.createdAt } });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.patch('/:id/comments/:commentId', auth, async (req, res) => {
  try { const text = String(req.body.text || '').trim(); if (!text || text.length > 500) return res.status(400).json({ message: 'Comment must be between 1 and 500 characters' }); const comment = await Comment.findOneAndUpdate({ _id: req.params.commentId, reel: req.params.id, author: req.user._id }, { text }, { new: true }); if (!comment) return res.status(404).json({ message: 'Comment not found or not owned by you' }); res.json({ comment }); } catch (error) { res.status(400).json({ message: error.message }); }
});
router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try { const comment = await Comment.findOne({ _id: req.params.commentId, reel: req.params.id, author: req.user._id }); if (!comment) return res.status(404).json({ message: 'Comment not found or not owned by you' }); const removed = await Comment.deleteMany({ $or: [{ _id: comment._id }, { parent: comment._id }] }); await Reel.updateOne({ _id: req.params.id }, { $inc: { commentCount: -removed.deletedCount } }); res.json({ message: 'Comment deleted', deletedCount: removed.deletedCount }); } catch (error) { res.status(400).json({ message: error.message }); }
});
router.post('/:id/comments/:commentId/like', auth, async (req, res) => {
  try { const comment = await Comment.findOne({ _id: req.params.commentId, reel: req.params.id }); if (!comment) return res.status(404).json({ message: 'Comment not found' }); const liked = comment.likes.some(id => String(id) === String(req.user._id)); liked ? comment.likes.pull(req.user._id) : comment.likes.push(req.user._id); await comment.save(); res.json({ liked: !liked, likes: comment.likes.length }); } catch (error) { res.status(400).json({ message: error.message }); }
});

router.post('/:id/like', auth, async (req, res) => {
  try { const reel = await Reel.findById(req.params.id); if (!reel) return res.status(404).json({ message: 'Reel not found' }); const exists = await Like.exists({ user: req.user._id, reel: reel._id }); if (exists) return res.status(409).json({ message: 'Reel is already liked' }); await Like.create({ user: req.user._id, reel: reel._id }); await Reel.updateOne({ _id: reel._id }, { $inc: { likeCount: 1 } }); await makeNotification(reel.author, req.user._id, 'like', reel._id); res.status(201).json({ liked: true, likes: reel.likeCount + 1 }); } catch (error) { res.status(400).json({ message: error.message }); }
});
router.delete('/:id/like', auth, async (req, res) => {
  try { const result = await Like.deleteOne({ user: req.user._id, reel: req.params.id }); if (!result.deletedCount) return res.status(404).json({ message: 'Like not found' }); const reel = await Reel.findByIdAndUpdate(req.params.id, { $inc: { likeCount: -1 } }, { new: true }); res.json({ liked: false, likes: Math.max(0, reel.likeCount) }); } catch (error) { res.status(400).json({ message: error.message }); }
});
router.post('/:id/save', auth, async (req, res) => {
  try { const reel = await Reel.findById(req.params.id); if (!reel) return res.status(404).json({ message: 'Reel not found' }); if (await Save.exists({ user: req.user._id, reel: reel._id })) return res.status(409).json({ message: 'Reel is already saved' }); await Save.create({ user: req.user._id, reel: reel._id }); await Reel.updateOne({ _id: reel._id }, { $inc: { saveCount: 1 } }); await makeNotification(reel.author, req.user._id, 'save', reel._id); res.status(201).json({ saved: true }); } catch (error) { res.status(400).json({ message: error.message }); }
});
router.delete('/:id/save', auth, async (req, res) => {
  try { const result = await Save.deleteOne({ user: req.user._id, reel: req.params.id }); if (!result.deletedCount) return res.status(404).json({ message: 'Save not found' }); await Reel.updateOne({ _id: req.params.id }, { $inc: { saveCount: -1 } }); res.json({ saved: false }); } catch (error) { res.status(400).json({ message: error.message }); }
});
router.post('/:id/view', optionalAuth, async (req, res) => {
  try { const viewerKey = req.user ? `user:${req.user._id}` : `session:${String(req.body.sessionId || '').slice(0, 80)}`; if (viewerKey.endsWith(':')) return res.status(400).json({ message: 'Viewer session is required' }); const result = await View.updateOne({ reel: req.params.id, viewerKey }, { $setOnInsert: { reel: req.params.id, viewerKey } }, { upsert: true }); if (result.upsertedCount) await Reel.updateOne({ _id: req.params.id }, { $inc: { viewCount: 1 } }); const reel = await Reel.findById(req.params.id).select('viewCount'); res.json({ counted: Boolean(result.upsertedCount), views: reel?.viewCount || 0 }); } catch (error) { res.status(400).json({ message: error.message }); }
});
router.post('/:id/share', optionalAuth, async (req, res) => { try { const reel = await Reel.findByIdAndUpdate(req.params.id, { $inc: { shareCount: 1 } }, { new: true }); if (!reel) return res.status(404).json({ message: 'Reel not found' }); res.json({ shares: reel.shareCount }); } catch (error) { res.status(400).json({ message: error.message }); } });

router.get('/:id', optionalAuth, async (req, res) => { try { const reel = await populated(Reel.findOne({ _id: req.params.id, status: 'published' })); if (!reel) return res.status(404).json({ message: 'Reel not found' }); res.json({ reel: await reelCard(reel, req.user?._id) }); } catch (error) { res.status(400).json({ message: error.message }); } });
router.delete('/:id', auth, async (req, res) => { try { const reel = await Reel.findById(req.params.id); if (!reel) return res.status(404).json({ message: 'Reel not found' }); if (String(reel.author) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ message: 'You cannot delete this reel' }); await Promise.all([Comment.deleteMany({ reel: reel._id }), Like.deleteMany({ reel: reel._id }), Save.deleteMany({ reel: reel._id }), View.deleteMany({ reel: reel._id }), reel.deleteOne()]); res.json({ message: 'Reel deleted' }); } catch (error) { res.status(400).json({ message: error.message }); } });
module.exports = router;
