const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Follow = require('../models/Follow');
const auth = require('../middleware/auth');
const router = express.Router();
const tokenFor = id => jwt.sign({ id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
async function publicUser(user, viewerId) {
  const [followers, following, isFollowing] = await Promise.all([Follow.countDocuments({ following: user._id }), Follow.countDocuments({ follower: user._id }), viewerId && String(viewerId) !== String(user._id) ? Follow.exists({ follower: viewerId, following: user._id }) : false]);
  return { id: user._id, name: user.name, username: user.username, email: user.email, avatar: user.avatar, bio: user.bio, preferences: user.preferences || [], location: user.location || {}, role: user.role, followers, following, isFollowing: Boolean(isFollowing), createdAt: user.createdAt };
}
router.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim(), email = String(req.body.email || '').toLowerCase().trim(), password = String(req.body.password || ''), username = String(req.body.username || name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')).toLowerCase();
    if (!name || !email.includes('@') || password.length < 6 || !/^[a-z0-9._]{3,30}$/.test(username)) return res.status(400).json({ message: 'Provide a name, valid email, username, and password of at least 6 characters' });
    if (await User.exists({ $or: [{ email }, { username }] })) return res.status(409).json({ message: 'That email or username is already in use' });
    const user = await User.create({ name, username, email, password: await bcrypt.hash(password, 12), avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=19211a&color=dfff66`, bio: 'Food lover' });
    res.status(201).json({ token: tokenFor(user._id), user: await publicUser(user) });
  } catch (error) { res.status(400).json({ message: error.message }); }
});
router.post('/login', async (req, res) => { try { const email = String(req.body.email || '').toLowerCase().trim(), user = await User.findOne({ email }); if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password))) return res.status(401).json({ message: 'Invalid email or password' }); res.json({ token: tokenFor(user._id), user: await publicUser(user, user._id) }); } catch (error) { res.status(500).json({ message: error.message }); } });
router.get('/me', auth, async (req, res) => res.json({ user: await publicUser(req.user, req.user._id) }));
module.exports = router;
module.exports.publicUser = publicUser;
