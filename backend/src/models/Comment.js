const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
  reel: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  text: { type: String, required: true, trim: true, maxlength: 500 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });
commentSchema.index({ reel: 1, parent: 1, createdAt: -1 });
module.exports = mongoose.model('Comment', commentSchema);
