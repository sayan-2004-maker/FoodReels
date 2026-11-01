const jwt = require('jsonwebtoken');
const User = require('../models/User');
module.exports = async function optionalAuth(req, res, next) {
  try { const header = req.headers.authorization || ''; if (header.startsWith('Bearer ')) { const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'dev-secret'); req.user = await User.findById(decoded.id); } } catch (_) { /* public request remains public */ }
  next();
};
