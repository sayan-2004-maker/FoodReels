const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true }, publicId: String,
  provider: { type: String, enum: ['local', 'cloudinary', 'external'], default: 'local' }
}, { _id: false });

const reelSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  caption: { type: String, default: '', maxlength: 2200 },
  video: { type: mediaSchema, required: true },
  thumbnail: { type: mediaSchema, default: null },
  location: { name: { type: String, default: '' }, city: { type: String, default: '' }, coordinates: { type: [Number], default: undefined } },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  hashtags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hashtag' }],
  recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  audio: { name: { type: String, default: 'Original food audio' }, artist: { type: String, default: '' } },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewCount: { type: Number, default: 0 }, likeCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 }, saveCount: { type: Number, default: 0 }, shareCount: { type: Number, default: 0 },
  status: { type: String, enum: ['published', 'removed'], default: 'published' }
}, { timestamps: true });

reelSchema.index({ createdAt: -1, status: 1 });
reelSchema.index({ category: 1, createdAt: -1 });
module.exports = mongoose.model('Reel', reelSchema);
