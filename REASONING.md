# Reasoning — HabitFlow

## 1. Problem Understanding

The goal of HabitFlow is to help users maintain consistency across multiple habits during a 75-day challenge.

The problem statement highlights several practical difficulties:

- Users follow multiple habits at the same time.
- Some habits are daily while others are scheduled only on specific weekdays.
- Users need to see only the habits relevant for today.
- Users want to know their current streak and best-ever streak.
- Users may stop following a habit temporarily and should be able to remove it from their active list without permanently deleting its history.
- Users need an easy way to find and update a particular habit.
- Users should be reminded about habits that they have not logged during the day.
- The application should work for different users rather than being designed only for Ananya.

Based on these requirements, the application was designed around a daily-first dashboard, reliable completion logging, schedule-aware streak calculations, and persistent database storage.

---

## 2. Technology Selection

The application uses a client-server architecture.

### Frontend

- React
- Vite
- CSS
- React Router

React was selected to provide a component-based and responsive user interface. Vite provides a lightweight development environment and fast frontend development.

### Backend

- Node.js
- Express.js

Express provides a simple REST API layer between the frontend and MongoDB.

### Database

- MongoDB Atlas
- Mongoose

MongoDB Atlas was selected because the application needs persistent storage for users, habits, completion history, schedules, and reports.

The database is the source of truth for application data. Local storage is not used to store habits, completion records, or other personal application data.

---

## 3. Database Design

The application uses three main collections/models:

### User

Stores user profile and challenge information.

Important fields include:

- `_id`
- `name`
- `email`
- `password`
- `wakeUpTime`
- `sleepTime`
- `exerciseTime`
- `challengeStartDate`
- `createdAt`
- `updatedAt`

Passwords are stored as secure hashes rather than plain text.

### Habit

Stores individual habits belonging to a user.

Important fields include:

- `_id`
- `userId`
- `name`
- `icon`
- `scheduleType`
- `scheduledDays`
- `reminderTime`
- `archived`
- `createdAt`
- `updatedAt`

The `userId` ensures that habits belong to the correct user.

### HabitLog

Completion history is stored separately from the Habit document.

Important fields include:

- `_id`
- `habitId`
- `userId`
- `completionDate`
- `createdAt`

A separate HabitLog collection makes it easier to maintain completion history, calculate streaks, generate reports, and query activity by date.

A uniqueness constraint is used for the combination of user, habit, and completion date to prevent duplicate completion records.

---

## 4. Why Habit Logs Are Separate

Completion history changes frequently and can grow over time.

Instead of storing an ever-growing array of completion dates inside every habit, completion events are stored in HabitLog documents.

This provides several advantages:

- Easier historical queries
- Better report generation
- Simpler completion and undo operations
- Cleaner Habit documents
- Better support for multiple users
- Easier streak calculations

For example, completing a habit creates a HabitLog record. Undoing the completion removes the corresponding log instead of modifying the habit itself.

---

## 5. Habit Scheduling

Habits can be configured as:

- Daily
- Selected weekdays

The application determines whether a habit is due on a particular date before considering its completion status.

The weekday mapping is:

```text
0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
```

This scheduling logic is shared by the dashboard, completion progress, reminders, and streak calculations.

This prevents different parts of the application from interpreting a habit's schedule differently.

---

## 6. Today's Habit Selection

The main dashboard is designed around what the user needs to see when opening the application.

The application:

1. Gets the user's active habits.
2. Checks which habits are scheduled for today.
3. Checks today's HabitLog records.
4. Displays the scheduled habits.
5. Shows whether each habit has already been completed.

Archived habits are excluded from today's active list.

This avoids showing unnecessary habits and keeps the dashboard focused on today's tasks.

---

## 7. Current Streak Calculation

Streak calculation is one of the most important parts of HabitFlow.

A streak cannot be calculated simply by counting total completions or comparing every calendar date.

The application first determines the dates on which a habit was actually scheduled.

For a daily habit:

```text
September 12 ✓
September 13 ✓
September 14 ✓
September 15 ✗
September 16 ✓
```

The current streak is:

```text
1
```

The previous streak was:

```text
3
```

For a Monday/Wednesday/Friday habit:

```text
Monday ✓
Tuesday -
Wednesday ✓
Thursday -
Friday ✓
```

The non-scheduled days do not break the streak.

This approach ensures that streaks represent consistency with the user's actual schedule.

---

## 8. Longest Streak

The longest streak represents the user's best historical streak.

The calculation examines the completion history and scheduled occurrences rather than only looking at the total number of completions.

Archived habits retain their historical data, so archiving a habit does not erase the user's achievements.

The same schedule-aware rules are used for both current and longest streak calculations.

---

## 9. Today's Completion Progress

The dashboard provides a completion percentage for the current day.

The calculation is:

```text
Completed scheduled habits today
-------------------------------- × 100
Total scheduled active habits today
```

For example:

```text
3 completed / 5 scheduled = 60%
```

The value updates after:

- Completing a habit
- Undoing a completion
- Adding a habit
- Editing a habit schedule
- Archiving a habit
- Restoring a habit

If no habits are scheduled for the day, the application handles the case separately instead of dividing by zero.

---

## 10. 75-Day Challenge Progress

The challenge progress is calculated using the user's `challengeStartDate`.

The current challenge day is calculated from the difference between the start date and today's date.

Conceptually:

```text
challengeDay = daysSinceStart + 1
```

The value is capped at 75.

The progress percentage is:

```text
challengeDay / 75 × 100
```

The dashboard displays:

- Current challenge day
- Total challenge days
- Percentage completed
- Days remaining
- Progress bar

When the challenge reaches 75 days, it is displayed as completed rather than showing a negative number of remaining days.

---

## 11. Morning Habit Reminder — The Twist

The challenge specifically requires the application to remind users each morning about habits that they have not logged for that day.

The reminder is calculated dynamically rather than creating unnecessary notification records.

The application:

1. Gets active habits.
2. Determines which are scheduled today.
3. Checks today's completion logs.
4. Removes already completed habits.
5. Displays the remaining habits as pending.

Conceptually:

```text
Pending habits =
Scheduled active habits today
-
Completed habits today
```

For example:

```text
Drink Water ✓
Read ✗
Workout ✗
No Sugar ✓
```

The application displays:

```text
Good morning!

You still have 2 habits to complete today.

Read
Workout
```

Once all scheduled habits are completed, the reminder changes to a completion message.

This reminder is also integrated with the notification/bell area.

A complex push-notification infrastructure was intentionally avoided because the core requirement can be satisfied through a dynamic in-app reminder.

---

## 12. Notifications and Alerts

A notification bell was added to the main navigation.

The navigation contains:

```text
Theme Toggle → Alerts → Profile
```

The notification area can show information such as:

- Pending habits
- Streak-at-risk messages
- Upcoming reminders
- Challenge progress

The notification information is derived from existing application data instead of maintaining a separate unnecessary notification database.

---

## 13. Archive Instead of Delete

The problem statement says that users may have habits they have quietly given up on but do not want permanently deleted.

Therefore, HabitFlow uses archiving.

Instead of deleting a habit:

```text
archived = true
```

Archived habits:

- Disappear from the active dashboard.
- Do not appear in today's pending habits.
- Do not appear in active habit searches.
- Remain stored in MongoDB.
- Keep their historical completion records.
- Can be restored later.

This preserves the user's history while keeping the active habit list clean.

---

## 14. Search

As the number of habits increases, finding a particular habit becomes important.

A simple case-insensitive search was implemented using the habit name.

This allows users to quickly find habits such as:

```text
Drink Water
Reading
Workout
Meditation
```

The search functionality is intentionally simple because the main requirement is finding and updating a particular habit rather than building a complex search engine.

---

## 15. Reports

The Reports section uses actual MongoDB data.

It provides information such as:

- Active habits
- Completed habits
- Current streak
- Longest streak
- Completion rate
- Challenge progress
- Weekly activity
- Recent activity
- Per-habit performance

Completion rate is schedule-aware.

It is calculated using:

```text
Completed scheduled occurrences
-------------------------------- × 100
Total scheduled occurrences
```

This prevents a weekday habit from being unfairly evaluated against every calendar day.

---

## 16. User Profiles and Authentication

The application supports multiple users.

Users can create a profile with information such as:

- Name
- Email
- Password
- Wake-up time
- Sleep time
- Exercise time
- Challenge start date

Login uses the user's email and password.

Passwords are hashed before being stored in MongoDB.

After authentication, the application loads data using the logged-in user's ID.

This ensures that one user cannot simply see another user's habits, logs, or reports.

A demo Ananya account is provided for evaluation:

```text
Email: ananya@example.com
Password: Ananya@123
```

The demo account allows evaluators to immediately test the application's populated dashboard.

---

## 17. Routing

The application separates authentication and application pages.

The main flow is:

```text
Login
  ↓
Authentication
  ↓
Dashboard
  ↓
Reports / History / Profile / Archived Habits
```

New users can select Create Profile from the Login page.

Users who are not logged in are redirected to the Login page when attempting to access protected application pages.

Logout clears the active session state without deleting the user's database records.

---

## 18. Light and Dark Mode

Both Light Mode and Dark Mode are supported.

A theme-variable approach is used so that colors can be changed consistently across the application.

The theme affects:

- Backgrounds
- Cards
- Text
- Borders
- Buttons
- Inputs
- Progress bars
- Reports
- History
- Profile
- Notifications
- Modals

A particular focus was placed on Light Mode contrast because pale text and progress indicators can become difficult to read against a light background.

Progress tracks use a visible background color and progress fills use a sufficiently contrasting primary color.

Theme preference may be stored in localStorage because it is a UI preference rather than application data.

User information, habits, completion history, streaks, and reports remain database-backed.

---

## 19. Responsive Design

The interface is designed to work across:

- Desktop
- Laptop
- Tablet
- Mobile

Cards and statistics use flexible layouts.

For smaller screens, content can stack vertically or use compact columns so that important information remains accessible without horizontal scrolling.

The notification dropdown and habit cards are also designed to remain usable on smaller screens.

---

## 20. Error and Loading States

The application provides feedback during API operations.

Examples include:

- Loading states
- Login errors
- Registration errors
- Database/API errors
- Empty habit states
- Empty history states
- No search results
- No archived habits

This prevents the interface from appearing broken when data is loading or unavailable.

---

## 21. Design Decisions Under Time Constraints

The project was implemented with a focus on the most important user requirements.

Priority was given to:

1. Persistent database storage
2. Habit creation and management
3. Daily scheduling
4. Completion logging
5. Current streak
6. Longest streak
7. Today's completion progress
8. Morning reminders
9. Challenge progress
10. Archive/restore
11. Reports and history
12. Authentication/profile
13. Theme support
14. Responsive UI

More complex features such as AI recommendations, social functionality, advanced push notifications, and complex analytics were intentionally avoided because they were not necessary to solve the core problem.

---

## 22. Why the Application Is Designed This Way

HabitFlow follows a simple principle:

```text
See today's habits
        ↓
Complete them
        ↓
Protect the streak
        ↓
Review progress
        ↓
Continue tomorrow
```

The dashboard therefore focuses on immediate daily action, while Reports and History provide longer-term feedback.

The database-backed architecture ensures that progress is persistent, while schedule-aware streak calculations make the application fair for users who do not perform every habit every day.

---

## 23. Future Improvements

Possible future improvements include:

- Browser/push notifications
- Email reminders
- More detailed calendar visualizations
- Advanced analytics
- Habit categories
- Custom notification schedules
- Multiple challenges
- Social/accountability features
- Cloud deployment
- More advanced authentication and session management
- Mobile application
- AI-based habit recommendations

These features were kept outside the core implementation so that the fundamental habit logging and streak experience remains reliable and understandable.