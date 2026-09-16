const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  passwordHash: { type: String, select: false },
  photo: String,
  wakeUpTime: { type: String, default: '07:00' },
  sleepTime: { type: String, default: '22:30' },
  exerciseTime: { type: String, default: '18:00' },
  challengeStartDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
