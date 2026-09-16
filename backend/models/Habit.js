const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  icon: { type: String, default: '✨' },
  scheduleType: { type: String, enum: ['daily', 'weekdays'], default: 'daily' },
  scheduledDays: { type: [Number], default: [] },
  reminderTime: { type: String, default: '' },
  archived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Habit', habitSchema);
