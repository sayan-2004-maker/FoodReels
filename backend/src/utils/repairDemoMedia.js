require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../db/db');
const Reel = require('../models/Reel');
const Restaurant = require('../models/Restaurant');
const Recipe = require('../models/Recipe');

const videoUrl = process.env.DEMO_VIDEO_URL || 'https://res.cloudinary.com/demo/video/upload/dog.mp4';
const coordinates = { Kolkata: [88.3639, 22.5726], Mumbai: [72.8777, 19.0760], Bengaluru: [77.5946, 12.9716], Delhi: [77.2090, 28.6139], Jaipur: [75.7873, 26.9124], Chennai: [80.2707, 13.0827], Lucknow: [80.9462, 26.8467], Pune: [73.8567, 18.5204], Indore: [75.8577, 22.7196], Hyderabad: [78.4867, 17.3850], Goa: [73.8278, 15.4909] };

async function repair() {
  await connectDB();
  const brokenVideos = /cdn\.coverr\.co\/videos/;
  const reels = await Reel.find({ 'video.url': brokenVideos });
  await Promise.all(reels.map(reel => Reel.updateOne({ _id: reel._id }, { $set: { 'video.url': videoUrl, 'video.provider': 'external', 'location.coordinates': coordinates[reel.location?.city] } })));
  const recipes = await Recipe.find();
  await Promise.all(recipes.map(recipe => Recipe.updateOne({ _id: recipe._id }, { $set: { 'location.coordinates': coordinates[recipe.location?.city] } })));
  const restaurantCoordinates = { 'Biryani House': [88.3639, 22.5726], 'Chili & Wok': [88.4089, 22.5806], 'Sweet Theory': [88.4720, 22.5726], 'The Oven Club': [72.8264, 19.0596] };
  await Promise.all(Object.entries(restaurantCoordinates).map(([name, point]) => Restaurant.updateOne({ name }, { $set: { 'location.coordinates': point } })));
  console.log(`Repaired ${reels.length} legacy demo video URLs and added location coordinates.`);
  await mongoose.disconnect();
}
repair().catch(error => { console.error(error); process.exit(1); });
