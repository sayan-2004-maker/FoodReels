const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foodreels';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 12000 });
  console.log('MongoDB connected');
}

module.exports = connectDB;
