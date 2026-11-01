const mongoose = require('mongoose');
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, reel: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true } }, { timestamps: true });
schema.index({ user: 1, reel: 1 }, { unique: true });
module.exports = mongoose.model('Like', schema);
