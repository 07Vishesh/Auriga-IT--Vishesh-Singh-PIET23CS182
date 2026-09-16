const mongoose = require('mongoose');

const habitLogSchema = new mongoose.Schema({
  habitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completionDate: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
habitLogSchema.index({ userId: 1, habitId: 1, completionDate: 1 }, { unique: true });

module.exports = mongoose.model('HabitLog', habitLogSchema);
