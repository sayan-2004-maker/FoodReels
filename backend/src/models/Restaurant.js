const mongoose = require('mongoose');
const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, cuisine: { type: String, default: 'Multi-cuisine' }, foodType: [{ type: String }],
  address: { type: String, default: '' },
  location: { name: { type: String, default: '' }, city: { type: String, default: '' }, coordinates: { type: [Number], default: undefined } },
  rating: { type: Number, default: 4.5, min: 0, max: 5 }, priceRange: { type: String, default: '₹₹' },
  image: { type: String, default: '' }, description: { type: String, default: '', maxlength: 600 }
}, { timestamps: true });
module.exports = mongoose.model('Restaurant', restaurantSchema);
