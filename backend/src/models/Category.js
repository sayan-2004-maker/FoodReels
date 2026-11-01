const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({ name: { type: String, required: true, unique: true, trim: true, maxlength: 50 }, slug: { type: String, required: true, unique: true, lowercase: true, trim: true }, icon: { type: String, default: '🍽️' }, image: { type: String, default: '' }, active: { type: Boolean, default: true } }, { timestamps: true });
module.exports = mongoose.model('Category', categorySchema);
