const express = require('express');
const Restaurant = require('../models/Restaurant');
const Reel = require('../models/Reel');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const router = express.Router();
const locationFrom = location => ({ name: String(location?.name || '').trim(), city: String(location?.city || '').trim(), coordinates: Array.isArray(location?.coordinates) ? location.coordinates : undefined });
const distanceInKm = (latitudeA, longitudeA, latitudeB, longitudeB) => {
  const radians = value => value * Math.PI / 180;
  const earthRadius = 6371;
  const latitudeDistance = radians(latitudeB - latitudeA), longitudeDistance = radians(longitudeB - longitudeA);
  const a = Math.sin(latitudeDistance / 2) ** 2 + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(longitudeDistance / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
router.get('/', async (req, res) => { try { const re = req.query.q ? new RegExp(String(req.query.q).slice(0, 80), 'i') : null; const query = re ? { $or: [{ name: re }, { cuisine: re }, { 'location.name': re }, { 'location.city': re }, { address: re }] } : {}; res.json({ restaurants: await Restaurant.find(query).sort({ rating: -1, name: 1 }).limit(60).lean() }); } catch (error) { res.status(500).json({ message: error.message }); } });
router.get('/nearby', async (req, res) => {
  try {
    const latitude = Number(req.query.lat), longitude = Number(req.query.lng), radiusKm = Math.min(100, Math.max(.1, Number(req.query.radiusKm) || 15));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return res.status(400).json({ message: 'Valid latitude and longitude are required.' });
    const restaurants = await Restaurant.find({ 'location.coordinates.0': { $exists: true }, 'location.coordinates.1': { $exists: true } }).lean();
    const nearby = restaurants.map(restaurant => ({ ...restaurant, distanceKm: distanceInKm(latitude, longitude, restaurant.location.coordinates[1], restaurant.location.coordinates[0]) })).filter(restaurant => restaurant.distanceKm <= radiusKm).sort((first, second) => first.distanceKm - second.distanceKm || second.rating - first.rating).slice(0, 25);
    res.json({ restaurants: nearby, center: { latitude, longitude }, radiusKm });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
router.get('/:id', async (req, res) => { try { const restaurant = await Restaurant.findById(req.params.id).lean(); if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' }); const reels = await Reel.find({ restaurant: restaurant._id, status: 'published' }).select('title thumbnail video viewCount likeCount').sort({ createdAt: -1 }); res.json({ restaurant, reels }); } catch (error) { res.status(400).json({ message: error.message }); } });
router.post('/', auth, admin, async (req, res) => { try { const restaurant = await Restaurant.create({ ...req.body, location: locationFrom(req.body.location) }); res.status(201).json({ restaurant }); } catch (error) { res.status(400).json({ message: error.message }); } });
router.patch('/:id', auth, admin, async (req, res) => { try { const values = { ...req.body }; if (req.body.location) values.location = locationFrom(req.body.location); const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, values, { new: true, runValidators: true }); if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' }); res.json({ restaurant }); } catch (error) { res.status(400).json({ message: error.message }); } });
router.delete('/:id', auth, admin, async (req, res) => { try { const result = await Restaurant.deleteOne({ _id: req.params.id }); if (!result.deletedCount) return res.status(404).json({ message: 'Restaurant not found' }); res.json({ message: 'Restaurant deleted' }); } catch (error) { res.status(400).json({ message: error.message }); } });
module.exports = router;
