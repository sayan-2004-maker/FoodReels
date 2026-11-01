const mongoose = require('mongoose');
const schema = new mongoose.Schema({ reel: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true }, viewerKey: { type: String, required: true, maxlength: 120 } }, { timestamps: true });
schema.index({ reel: 1, viewerKey: 1 }, { unique: true });
module.exports = mongoose.model('View', schema);
