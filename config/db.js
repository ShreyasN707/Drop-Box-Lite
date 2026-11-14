const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dropbox_lite';
  try {
    await mongoose.connect(uri);
    console.log(`[MongoDB] Connected to database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('[MongoDB] Connection error:', error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
