const mongoose = require('mongoose');
const schema = new mongoose.Schema({ recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, type: { type: String, enum: ['follow', 'like', 'comment', 'reply', 'save'], required: true }, reel: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel' }, comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }, read: { type: Boolean, default: false } }, { timestamps: true });
module.exports = mongoose.model('Notification', schema);
