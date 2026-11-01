const mongoose = require('mongoose');
const hashtagSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9_]+$/ }, usageCount: { type: Number, default: 0 } }, { timestamps: true });
module.exports = mongoose.model('Hashtag', hashtagSchema);
