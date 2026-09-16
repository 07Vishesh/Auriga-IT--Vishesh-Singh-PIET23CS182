function dateKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function isHabitDueOnDate(habit, date) {
  if (habit.scheduleType === 'daily') return true;
  return (habit.scheduledDays || []).includes(new Date(date).getDay());
}

function getCurrentStreak(habit, completionDates, today = new Date()) {
  const completed = new Set(completionDates.map(dateKey));
  let cursor = new Date(today);
  // An incomplete occurrence today should not erase the streak earned before today.
  if (isHabitDueOnDate(habit, cursor) && !completed.has(dateKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (true) {
    if (isHabitDueOnDate(habit, cursor)) {
      if (!completed.has(dateKey(cursor))) break;
      streak += 1;
    }
    cursor = addDays(cursor, -1);
    if (streak > 10000) break;
  }
  return streak;
}

function getBestStreak(habit, completionDates) {
  if (!completionDates.length) return 0;
  const completed = new Set(completionDates.map(dateKey));
  const dates = completionDates.map(dateKey).sort();
  let cursor = new Date(`${dates[0]}T12:00:00`);
  const end = new Date(`${dates[dates.length - 1]}T12:00:00`);
  let running = 0;
  let best = 0;
  while (cursor <= end) {
    if (isHabitDueOnDate(habit, cursor)) {
      if (completed.has(dateKey(cursor))) {
        running += 1;
        best = Math.max(best, running);
      } else {
        running = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

module.exports = { dateKey, isHabitDueOnDate, getCurrentStreak, getBestStreak };
