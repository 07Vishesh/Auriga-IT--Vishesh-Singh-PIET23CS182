require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Habit = require('./models/Habit');
const HabitLog = require('./models/HabitLog');
const { dateKey, getCurrentStreak, getBestStreak, isHabitDueOnDate } = require('./utils/streak');

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(origin => origin.trim());
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin) || /^https:\/\/.*\.app\.github\.dev$/.test(origin)) return callback(null, true); callback(new Error('CORS origin is not allowed')); } }));
app.use(express.json());

const demoHabits = [
  ['Drink Water', '💧', 'daily', [], '09:00'],
  ['Read', '📖', 'weekdays', [1, 2, 3, 4, 5], '17:00'],
  ['Workout', '🔥', 'weekdays', [1, 3, 5], '18:00'],
  ['No Sugar', '🍎', 'daily', [], '12:00'],
  ['Meditation', '🧘', 'weekdays', [2, 4], '07:30']
];

async function seedDemo() {
  let user = await User.findOne({ email: 'ananya@example.com' }).select('+passwordHash');
  if (!user) user = await User.create({ name: 'Ananya', email: 'ananya@example.com', passwordHash: await bcrypt.hash('Ananya@123', 10), challengeStartDate: new Date() });
  else if (!user.passwordHash) { user.passwordHash = await bcrypt.hash('Ananya@123', 10); await user.save(); }
  const count = await Habit.countDocuments({ userId: user._id });
  if (!count) await Habit.insertMany(demoHabits.map(([name, icon, scheduleType, scheduledDays, reminderTime]) => ({ userId: user._id, name, icon, scheduleType, scheduledDays, reminderTime })));
  const demoToday = dateKey(new Date());
  if (!(await HabitLog.exists({ userId: user._id, completionDate: demoToday }))) {
    const dailyHabits = await Habit.find({ userId: user._id, name: { $in: ['Drink Water', 'No Sugar'] } }).select('_id').lean();
    if (dailyHabits.length) await HabitLog.insertMany(dailyHabits.map(habit => ({ habitId: habit._id, userId: user._id, completionDate: demoToday })), { ordered: false });
  }
  return user;
}

function asyncRoute(handler) { return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next); }
function validateId(id) { return mongoose.isValidObjectId(id); }
async function habitStats(habit, userId) {
  const logs = await HabitLog.find({ habitId: habit._id, userId }).sort({ completionDate: 1 }).lean();
  return { currentStreak: getCurrentStreak(habit, logs.map(log => log.completionDate)), bestStreak: getBestStreak(habit, logs.map(log => log.completionDate)), completedToday: logs.some(log => log.completionDate === dateKey(new Date())), logs: logs.map(log => log.completionDate) };
}

// Development-only fallback for running the UI before MongoDB is configured.
const memoryUser = { _id: '000000000000000000000001', name: 'Ananya', email: 'ananya@example.com', passwordHash: bcrypt.hashSync('Ananya@123', 10), wakeUpTime: '07:00', sleepTime: '22:30', exerciseTime: '18:00', challengeStartDate: new Date().toISOString() };
const memoryUsers = [memoryUser];
const memoryHabits = demoHabits.map(([name, icon, scheduleType, scheduledDays, reminderTime], index) => ({ _id: `00000000000000000000000${index + 2}`, userId: memoryUser._id, name, icon, scheduleType, scheduledDays, reminderTime, archived: false }));
const memoryLogs = [
  { _id: 'demo-log-water', habitId: memoryHabits[0]._id, userId: memoryUser._id, completionDate: dateKey(new Date()), createdAt: new Date().toISOString() },
  { _id: 'demo-log-sugar', habitId: memoryHabits[3]._id, userId: memoryUser._id, completionDate: dateKey(new Date()), createdAt: new Date().toISOString() },
];
const safeMemoryUser = user => { const { passwordHash, ...safeUser } = user; return safeUser; };
function memoryStats(habit) {
  const dates = memoryLogs.filter(log => log.habitId === habit._id && log.userId === habit.userId).map(log => log.completionDate);
  return { currentStreak: getCurrentStreak(habit, dates), bestStreak: getBestStreak(habit, dates), completedToday: dates.includes(dateKey(new Date())), logs: dates };
}
function buildReport(user, habits, logs) {
  const todayDate = new Date();
  const todayString = dateKey(todayDate);
  const challengeStart = new Date(user.challengeStartDate || todayDate);
  const challengeDay = Math.min(75, Math.max(1, Math.floor((todayDate - challengeStart) / 86400000) + 1));
  const activeHabits = habits.filter(habit => !habit.archived);
  const logsForHabit = habitId => logs.filter(log => String(log.habitId) === String(habitId) && String(log.userId) === String(user._id));
  const scheduledDates = (habit, start, end) => {
    const dates = [];
    const cursor = new Date(start);
    cursor.setHours(12, 0, 0, 0);
    const last = new Date(end);
    last.setHours(12, 0, 0, 0);
    while (cursor <= last) { if (isHabitDueOnDate(habit, cursor)) dates.push(dateKey(cursor)); cursor.setDate(cursor.getDate() + 1); }
    return dates;
  };
  const performance = activeHabits.map(habit => {
    const habitLogs = logsForHabit(habit._id);
    const completedDates = habitLogs.map(log => log.completionDate);
    const expected = scheduledDates(habit, new Date(Math.max(challengeStart.getTime(), new Date(habit.createdAt || challengeStart).getTime())), todayDate);
    const completedExpected = expected.filter(date => completedDates.includes(date)).length;
    return { ...habit, currentStreak: getCurrentStreak(habit, completedDates), bestStreak: getBestStreak(habit, completedDates), totalCompletions: completedDates.length, completionRate: expected.length ? Math.round(completedExpected / expected.length * 100) : 0 };
  });
  const allStreaks = habits.map(habit => { const dates = logsForHabit(habit._id).map(log => log.completionDate); return { current: getCurrentStreak(habit, dates), best: getBestStreak(habit, dates) }; });
  const weekStart = new Date(todayDate); weekStart.setDate(weekStart.getDate() - 6);
  const weeklyOverview = Array.from({ length: 7 }, (_, index) => { const date = new Date(weekStart); date.setDate(weekStart.getDate() + index); const key = dateKey(date); const scheduled = activeHabits.filter(habit => isHabitDueOnDate(habit, date)); const completed = scheduled.filter(habit => logs.some(log => String(log.habitId) === String(habit._id) && String(log.userId) === String(user._id) && log.completionDate === key)).length; return { date: key, label: date.toLocaleDateString(undefined, { weekday: 'short' }), scheduled: scheduled.length, completed, completionRate: scheduled.length ? Math.round(completed / scheduled.length * 100) : 0 }; });
  const recentActivity = logs.filter(log => String(log.userId) === String(user._id)).sort((a, b) => b.completionDate.localeCompare(a.completionDate)).slice(0, 20).map(log => { const habit = habits.find(item => String(item._id) === String(log.habitId)); return { ...log, habit: habit ? { name: habit.name, icon: habit.icon } : null }; });
  const expectedAll = activeHabits.flatMap(habit => scheduledDates(habit, new Date(Math.max(challengeStart.getTime(), new Date(habit.createdAt || challengeStart).getTime())), todayDate));
  const completedAll = activeHabits.reduce((total, habit) => total + scheduledDates(habit, new Date(Math.max(challengeStart.getTime(), new Date(habit.createdAt || challengeStart).getTime())), todayDate).filter(date => logsForHabit(habit._id).some(log => log.completionDate === date)).length, 0);
  const completedToday = activeHabits.filter(habit => logsForHabit(habit._id).some(log => log.completionDate === todayString)).length;
  const currentBestStreak = performance.reduce((best, habit) => Math.max(best, habit.currentStreak), 0);
  const allTodayComplete = activeHabits.length > 0 && completedToday === activeHabits.filter(habit => isHabitDueOnDate(habit, todayDate)).length;
  return { totalHabits: activeHabits.length, completedToday, currentBestStreak, challengeActiveStreak: allStreaks.reduce((best, streak) => Math.max(best, streak.current), 0), challengeLongestStreak: allStreaks.reduce((best, streak) => Math.max(best, streak.best), 0), overallCompletionRate: expectedAll.length ? Math.round(completedAll / expectedAll.length * 100) : 0, challengeDay, daysCompleted: new Set(logs.filter(log => String(log.userId) === String(user._id)).map(log => log.completionDate)).size, daysRemaining: Math.max(0, 75 - challengeDay), challengeComplete: challengeDay >= 75, habitPerformance: performance, weeklyOverview, recentActivity, allTodayComplete };
}
function registerMemoryRoutes() {
  console.warn('MONGODB_URI not set: running in-memory development mode. Data resets when the backend restarts.');
  app.get('/api/health', (req, res) => res.json({ ok: true, database: false, mode: 'memory' }));
  app.get('/api/demo', (req, res) => res.json({ userId: memoryUser._id }));
  app.post('/api/auth/login', asyncRoute(async (req, res) => { const email = String(req.body.email || '').toLowerCase().trim(); const user = memoryUsers.find(item => item.email === email); const valid = user && await bcrypt.compare(String(req.body.password || ''), user.passwordHash); if (!valid) return res.status(401).json({ message: 'Invalid email or password' }); res.json(safeMemoryUser(user)); }));
  app.post('/api/auth/register', asyncRoute(async (req, res) => { const { name, email, password } = req.body; const normalizedEmail = String(email || '').toLowerCase().trim(); if (!name || !normalizedEmail || !password || password.length < 8) return res.status(400).json({ message: 'Name, valid email, and an 8-character password are required' }); if (memoryUsers.some(user => user.email === normalizedEmail)) return res.status(409).json({ message: 'An account with this email already exists' }); const user = { _id: `memory-user-${Date.now()}`, name, email: normalizedEmail, passwordHash: await bcrypt.hash(password, 10), wakeUpTime: req.body.wakeUpTime || '07:00', sleepTime: req.body.sleepTime || '22:30', exerciseTime: req.body.exerciseTime || '18:00', challengeStartDate: new Date().toISOString() }; memoryUsers.push(user); res.status(201).json(safeMemoryUser(user)); }));
  app.post('/api/users', (req, res) => { Object.assign(memoryUser, req.body); res.status(201).json(safeMemoryUser(memoryUser)); });
  app.get('/api/users/:id', (req, res) => { const user = memoryUsers.find(item => item._id === req.params.id); return user ? res.json(safeMemoryUser(user)) : res.status(404).json({ message: 'User not found' }); });
  app.put('/api/users/:id', (req, res) => { const user = memoryUsers.find(item => item._id === req.params.id); if (!user) return res.status(404).json({ message: 'User not found' }); Object.assign(user, req.body); res.json(safeMemoryUser(user)); });
  app.get('/api/habits', (req, res) => { if (!memoryUsers.some(user => user._id === req.query.userId)) return res.status(404).json({ message: 'User not found' }); res.json(memoryHabits.filter(habit => habit.userId === req.query.userId).map(habit => ({ ...habit, ...memoryStats(habit) }))); });
  app.post('/api/habits', (req, res) => { if (!memoryUsers.some(user => user._id === req.body.userId) || !req.body.name) return res.status(400).json({ message: 'Name and valid userId are required' }); const habit = { ...req.body, _id: `memory-${Date.now()}`, archived: false, scheduledDays: req.body.scheduledDays || [] }; memoryHabits.push(habit); res.status(201).json(habit); });
  app.put('/api/habits/:id', (req, res) => { const habit = memoryHabits.find(item => item._id === req.params.id); if (!habit) return res.status(404).json({ message: 'Habit not found' }); if (req.body.userId && req.body.userId !== habit.userId) return res.status(403).json({ message: 'Habit does not belong to this user' }); Object.assign(habit, req.body, { userId: habit.userId }); res.json(habit); });
  app.patch('/api/habits/:id/archive', (req, res) => { const habit = memoryHabits.find(item => item._id === req.params.id); if (!habit) return res.status(404).json({ message: 'Habit not found' }); habit.archived = true; res.json(habit); });
  app.patch('/api/habits/:id/restore', (req, res) => { const habit = memoryHabits.find(item => item._id === req.params.id); if (!habit) return res.status(404).json({ message: 'Habit not found' }); habit.archived = false; res.json(habit); });
  app.get('/api/habits/:id/logs', (req, res) => res.json(memoryLogs.filter(log => log.habitId === req.params.id)));
  app.post('/api/habits/:id/complete', (req, res) => { const habit = memoryHabits.find(item => item._id === req.params.id); if (!habit) return res.status(404).json({ message: 'Habit not found' }); if (req.body.userId !== habit.userId) return res.status(403).json({ message: 'Habit does not belong to this user' }); const completionDate = req.body.completionDate || dateKey(new Date()); if (!isHabitDueOnDate(habit, new Date(`${completionDate}T12:00:00`))) return res.status(400).json({ message: 'Habit is not scheduled for this date' }); if (memoryLogs.some(log => log.habitId === habit._id && log.completionDate === completionDate)) return res.status(409).json({ message: 'Already completed today' }); memoryLogs.push({ _id: `log-${Date.now()}`, habitId: habit._id, userId: habit.userId, completionDate, createdAt: new Date().toISOString() }); res.status(201).json(memoryStats(habit)); });
  app.delete('/api/habits/:id/complete/:date', (req, res) => { const index = memoryLogs.findIndex(log => log.habitId === req.params.id && log.completionDate === req.params.date); if (index >= 0) memoryLogs.splice(index, 1); const habit = memoryHabits.find(item => item._id === req.params.id); if (!habit) return res.status(404).json({ message: 'Habit not found' }); res.json(memoryStats(habit)); });
  app.get('/api/history', (req, res) => { const grouped = {}; memoryLogs.filter(log => log.userId === req.query.userId).sort((a, b) => b.completionDate.localeCompare(a.completionDate)).forEach(log => { const habit = memoryHabits.find(item => item._id === log.habitId); (grouped[log.completionDate] ||= []).push({ ...log, habitId: habit ? { name: habit.name, icon: habit.icon } : null }); }); res.json(grouped); });
  app.get('/api/reports/:userId', (req, res) => { const user = memoryUsers.find(item => item._id === req.params.userId); return user ? res.json(buildReport(user, memoryHabits.filter(habit => habit.userId === user._id), memoryLogs)) : res.status(404).json({ message: 'User not found' }); });
}

if (!process.env.MONGODB_URI) registerMemoryRoutes();
app.get('/api/health', (req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 }));
app.get('/api/demo', asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: 'ananya@example.com' });
  if (!user) return res.status(404).json({ message: 'Demo user not found' });
  res.json({ userId: user._id });
}));
app.post('/api/users', asyncRoute(async (req, res) => res.status(201).json(await User.create(req.body))));
app.post('/api/auth/login', asyncRoute(async (req, res) => { const email = String(req.body.email || '').toLowerCase().trim(); const user = await User.findOne({ email }).select('+passwordHash'); if (!user || !user.passwordHash || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password' }); const safeUser = user.toObject(); delete safeUser.passwordHash; res.json(safeUser); }));
app.post('/api/auth/register', asyncRoute(async (req, res) => { const { name, email, password, wakeUpTime, sleepTime, exerciseTime, challengeStartDate } = req.body; if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: 'Name, valid email, and an 8-character password are required' }); if (await User.exists({ email: email.toLowerCase().trim() })) return res.status(409).json({ message: 'An account with this email already exists' }); const user = await User.create({ name, email: email.toLowerCase().trim(), passwordHash: await bcrypt.hash(password, 10), wakeUpTime, sleepTime, exerciseTime, challengeStartDate }); const safeUser = user.toObject(); delete safeUser.passwordHash; res.status(201).json(safeUser); }));
app.get('/api/users/:id', asyncRoute(async (req, res) => {
  if (!validateId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}));
app.put('/api/users/:id', asyncRoute(async (req, res) => {
  if (!validateId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}));

app.get('/api/habits', asyncRoute(async (req, res) => {
  if (!req.query.userId || !validateId(req.query.userId)) return res.status(400).json({ message: 'Valid userId is required' });
  const habits = await Habit.find({ userId: req.query.userId }).sort({ createdAt: 1 }).lean();
  res.json(await Promise.all(habits.map(async habit => ({ ...habit, ...(await habitStats(habit, req.query.userId)) }))));
}));
app.post('/api/habits', asyncRoute(async (req, res) => {
  const { name, userId } = req.body;
  if (!name || !userId || !validateId(userId)) return res.status(400).json({ message: 'Name and valid userId are required' });
  if (!await User.exists({ _id: userId })) return res.status(404).json({ message: 'User not found' });
  res.status(201).json(await Habit.create(req.body));
}));
app.put('/api/habits/:id', asyncRoute(async (req, res) => {
  if (!validateId(req.params.id)) return res.status(400).json({ message: 'Invalid habit id' });
  const existing = await Habit.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Habit not found' });
  if (req.body.userId && String(req.body.userId) !== String(existing.userId)) return res.status(403).json({ message: 'Habit does not belong to this user' });
  const habit = await Habit.findByIdAndUpdate(req.params.id, { ...req.body, userId: existing.userId }, { new: true, runValidators: true });
  res.json(habit);
}));
app.patch('/api/habits/:id/archive', asyncRoute(async (req, res) => {
  const habit = await Habit.findByIdAndUpdate(req.params.id, { archived: true }, { new: true });
  if (!habit) return res.status(404).json({ message: 'Habit not found' });
  res.json(habit);
}));
app.patch('/api/habits/:id/restore', asyncRoute(async (req, res) => {
  const habit = await Habit.findByIdAndUpdate(req.params.id, { archived: false }, { new: true });
  if (!habit) return res.status(404).json({ message: 'Habit not found' });
  res.json(habit);
}));

app.get('/api/habits/:id/logs', asyncRoute(async (req, res) => {
  const logs = await HabitLog.find({ habitId: req.params.id }).sort({ completionDate: -1 }).lean();
  res.json(logs);
}));
app.post('/api/habits/:id/complete', asyncRoute(async (req, res) => {
  const habit = await Habit.findById(req.params.id);
  if (!habit) return res.status(404).json({ message: 'Habit not found' });
  const userId = String(req.body.userId || habit.userId);
  if (userId !== String(habit.userId)) return res.status(403).json({ message: 'Habit does not belong to this user' });
  const completionDate = req.body.completionDate || dateKey(new Date());
  if (!isHabitDueOnDate(habit, new Date(`${completionDate}T12:00:00`))) return res.status(400).json({ message: 'Habit is not scheduled for this date' });
  try { await HabitLog.create({ habitId: habit._id, userId, completionDate }); } catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'Already completed today' }); throw error; }
  res.status(201).json(await habitStats(habit, userId));
}));
app.delete('/api/habits/:id/complete/:date', asyncRoute(async (req, res) => {
  const habit = await Habit.findById(req.params.id);
  if (!habit) return res.status(404).json({ message: 'Habit not found' });
  await HabitLog.deleteOne({ habitId: habit._id, completionDate: req.params.date });
  res.json(await habitStats(habit, habit.userId));
}));

app.get('/api/history', asyncRoute(async (req, res) => {
  if (!req.query.userId || !validateId(req.query.userId)) return res.status(400).json({ message: 'Valid userId is required' });
  const logs = await HabitLog.find({ userId: req.query.userId }).populate('habitId', 'name icon').sort({ completionDate: -1 }).lean();
  const grouped = logs.reduce((groups, log) => { (groups[log.completionDate] ||= []).push(log); return groups; }, {});
  res.json(grouped);
}));
app.get('/api/reports/:userId', asyncRoute(async (req, res) => {
  if (!validateId(req.params.userId)) return res.status(400).json({ message: 'Invalid user id' });
  const user = await User.findById(req.params.userId).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  const [habits, logs] = await Promise.all([Habit.find({ userId: user._id }).lean(), HabitLog.find({ userId: user._id }).lean()]);
  res.json(buildReport(user, habits, logs));
}));

app.use((error, req, res, next) => { console.error(error); res.status(error.name === 'ValidationError' ? 400 : 500).json({ message: error.message || 'Server error' }); });

async function start() {
  if (!process.env.MONGODB_URI) {
    return app.listen(port, () => console.log(`HabitFlow API running in memory mode on http://localhost:${port}`));
  }
  await mongoose.connect(process.env.MONGODB_URI);
  await seedDemo();
  app.listen(port, () => console.log(`HabitFlow API running on http://localhost:${port}`));
}
if (require.main === module) start().catch(error => { console.error('Startup failed:', error.message); process.exit(1); });
module.exports = { app, seedDemo };
