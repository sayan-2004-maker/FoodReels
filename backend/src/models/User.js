const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9._]{3,30}$/ },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  bio: { type: String, default: 'Food lover', maxlength: 180 },
  preferences: [{ type: String, trim: true }],
  location: { name: { type: String, default: '' }, city: { type: String, default: '' } },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
