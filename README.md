# HabitFlow

HabitFlow is a 75-day habit and routine tracker for daily habits and selected-weekday routines. It helps users see what is due today, complete habits, protect streaks, review performance, and receive a focused morning reminder for unfinished habits.

## Overview

HabitFlow has a React/Vite frontend and an Express/Mongoose REST API. MongoDB is the source of truth when `MONGODB_URI` is configured. For local demonstration without a database, the backend has an explicitly labeled in-memory fallback with the same API contract; fallback data resets when the backend restarts.

## Problem Statement

Self-improvement challenges become difficult to maintain when users cannot quickly see today's commitments or when non-daily schedules produce incorrect streaks. HabitFlow solves this with a daily-first dashboard, schedule-aware streaks, persistent completion events, progress reports, and reminders for habits still pending today.

## Features

### Authentication and profiles

- Login at `/login` with the seeded Ananya demo account
- Registration at `/register`
- Bcrypt password hashing in MongoDB
- Protected dashboard, reports, history, profile, and archived-habit views
- Logout without deleting application data
- Editable name, email, wake-up time, sleep time, exercise time, and challenge start date

### Habits and scheduling

- Add and edit habits without leaving the dashboard
- Daily or selected-weekday schedules
- Reminder time display and next upcoming reminder
- Case-insensitive partial search
- All, Completed Today, and Pending filters
- Archive and restore without deleting completion history

### Dashboard and completion

- Today's scheduled, active habits only
- Complete and undo actions backed by HabitLog records
- Current streak and best streak on every habit
- Challenge day, days remaining, completion percentage, active streak, and longest streak
- Today's completion progress
- Motivational completion feedback
- Streak-at-risk messaging

### Morning reminders and alerts

- Dynamic morning reminder for active habits scheduled today but not completed
- All-caught-up state after every scheduled habit is complete
- Notification bell with pending habits, streak warnings, reminders, and challenge alerts
- Ignore individual alerts or clear all visible alerts
- Dismissed notification UI state persists per user and local date only
- Ignoring an alert never changes a habit, HabitLog, streak, or schedule

### Reports and history

- Real-data Habit Performance Report
- Overall schedule-aware completion rate
- Per-habit total completions, completion rate, current streak, and best streak
- Seven-day overview and recent activity
- Rule-based progress insights
- Chronological completion history grouped by Today, Yesterday, or date

### UI and accessibility

- Light and dark themes across all pages, forms, modals, reports, and alerts
- Theme preference persists in localStorage; application data does not
- System color preference used when no theme was selected
- Responsive desktop, tablet, and mobile layouts
- Accessible labels for controls and completion buttons
- Loading, error, empty, completed, and confirmation states

## Tech Stack

- Frontend: React 19, Vite, JavaScript, CSS, lucide-react
- Backend: Node.js, Express, REST API, CORS, dotenv, bcryptjs
- Database: MongoDB Atlas and Mongoose
- Runtime tested with Node.js 24 and npm 11

## Architecture

```text
React/Vite client
	|
	| JSON REST requests through /api
	v
Express API
	|
	| Mongoose models and shared streak utilities
	v
MongoDB Atlas
```

The Vite development server proxies `/api` to `http://localhost:5000`, avoiding cross-origin configuration during local development. The backend owns validation, schedule checks, authentication comparison, persistence, report aggregation, and streak calculation.

## Project Structure

```text
.
├── backend/
│   ├── models/
│   │   ├── Habit.js
│   │   ├── HabitLog.js
│   │   └── User.js
│   ├── utils/
│   │   ├── streak.js
│   │   └── streak.test.js
│   └── server.js
├── Frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── auth.css
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── theme-contrast.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── .gitignore
├── AI_LOGS.md
├── README.md
├── REASONING.md
├── package.json
└── package-lock.json
```

## Database Models

### User

Stores name, unique email, bcrypt `passwordHash`, routine times, optional photo, challenge start date, and timestamps. Password hashes are excluded from normal queries and are never returned by login or registration responses.

### Habit

Stores `userId`, name, icon, `scheduleType`, selected `scheduledDays`, reminder time, archive state, and timestamps. `scheduleType` is either `daily` or `weekdays`; weekday numbers use Sunday `0` through Saturday `6`.

### HabitLog

Stores one completion event with `habitId`, `userId`, `completionDate`, and `createdAt`. A unique compound index on `userId + habitId + completionDate` prevents duplicate completions.

HabitLog is separate from Habit so completion history remains queryable, streaks are calculated from events, and archiving a habit does not delete its history.

## MongoDB Setup

1. Create a MongoDB Atlas cluster.
2. Create a database user and allow the Codespace IP or appropriate network access.
3. Copy the connection string.
4. Create a local `.env` from `.env.example`.
5. Set `MONGODB_URI` to the Atlas connection string.
6. Start the backend.

On the first successful MongoDB connection, the backend creates the Ananya demo account and the five demo habits if they do not already exist. It also ensures the demo password hash exists and does not create duplicate Ananya users.

## Environment Variables

Root `.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/habitflow
PORT=5000
CLIENT_URL=http://localhost:5173
```

Optional `Frontend/.env`:

```env
VITE_API_BASE_URL=
```

Leave `VITE_API_BASE_URL` empty for the Vite proxy. Never commit `.env`, database credentials, passwords, API keys, or tokens. Only the UI theme preference and dismissed alert IDs are stored in localStorage; users, habits, logs, streaks, and reports are not.

## Installation

From the repository root:

```bash
npm install
cd Frontend
npm install
cd ..
```

## Running the Backend

With MongoDB configured:

```bash
npm run dev
```

The API listens on `http://localhost:5000`.

Without MongoDB, the same command starts the development-only in-memory mode:

```text
MONGODB_URI not set: running in-memory development mode.
```

This is useful for demonstrating the UI, but data resets when the process restarts. Use MongoDB for persistence and submission verification.

## Running the Frontend

In a second terminal:

```bash
cd Frontend
npm run dev -- --host 0.0.0.0
```

Open the Vite URL, normally `http://localhost:5173`. In Codespaces, use the forwarded port URL. The frontend proxies `/api` requests to the backend.

## Demo Login

Open `http://localhost:5173/login`:

```text
Email: ananya@example.com
Password: Ananya@123
```

The demo account is validated by `POST /api/auth/login`; login success is not hardcoded in the frontend. In MongoDB, the password is stored only as a bcrypt hash. The demo fallback uses the same credential comparison in memory.

## API Endpoints

### Health and demo

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check API and database mode |
| GET | `/api/demo` | Return the seeded demo user ID |

### Authentication and users

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Validate email and password |
| POST | `/api/auth/register` | Create a profile with a bcrypt password hash |
| POST | `/api/users` | Create a user record |
| GET | `/api/users/:id` | Fetch a user without password hash |
| PUT | `/api/users/:id` | Update profile fields |

### Habits

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/habits?userId=:userId` | Fetch user habits with completion/streak stats |
| POST | `/api/habits` | Create a habit |
| PUT | `/api/habits/:id` | Edit a habit |
| PATCH | `/api/habits/:id/archive` | Archive a habit |
| PATCH | `/api/habits/:id/restore` | Restore a habit |

### Completion, history, and reports

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/habits/:id/logs` | Fetch habit completion logs |
| POST | `/api/habits/:id/complete` | Create today's completion |
| DELETE | `/api/habits/:id/complete/:date` | Undo a completion |
| GET | `/api/history?userId=:userId` | Group completion history by date |
| GET | `/api/reports/:userId` | Calculate report statistics from User, Habit, and HabitLog |

## Streak Logic

The reusable functions in `backend/utils/streak.js` are:

- `isHabitDueOnDate(habit, date)`
- `getCurrentStreak(habit, completionDates)`
- `getBestStreak(habit, completionDates)`

Daily habits evaluate every calendar date. Weekday habits evaluate only their selected weekdays, so non-scheduled days do not break a streak. If a habit is due today but not completed yet, the current streak checks the previous scheduled occurrence rather than immediately reducing the existing streak. Tests cover daily gaps, weekday gaps, month boundaries, year boundaries, and today's incomplete occurrence.

Run the utility tests with:

```bash
node backend/utils/streak.test.js
```

## Morning Habit Reminder

Every dashboard load dynamically compares active habits scheduled for the user's current local day with today's HabitLog completion records. The result is:

```text
remaining habits = scheduled active habits today - completed habits today
```

The morning card and notification bell use the same dashboard data. Archived habits, non-scheduled habits, and already-completed habits are excluded. Completing or undoing a habit refreshes the dashboard, report, progress, and reminder count. No reminder records are created in MongoDB.

## Notifications

The notification bell shows pending habits, streak-risk warnings, upcoming reminders, challenge progress, and the morning summary. Each alert has a stable ID. Users can ignore one alert or clear all visible alerts. Dismissals are stored only as per-user, per-day UI state in localStorage; ignoring an alert never changes the underlying habit or completion data.

## Reports

The Reports page uses `GET /api/reports/:userId`. The backend calculates active habit totals, completed today, current and longest streak maxima, challenge progress, schedule-aware completion rates, per-habit performance, the last seven days, recent activity, and rule-based insights from database records.

## Theme System

The Light/Dark toggle applies to the dashboard, reports, history, profile, archived habits, authentication pages, forms, modals, alerts, progress bars, and empty/error states. The selected theme is stored under the `habitflow-theme` localStorage key. No application data is stored there. `theme-contrast.css` provides explicit contrast tokens for challenge text, progress tracks, progress fills, completed states, borders, and form controls.

## Debugging

Check backend health:

```bash
curl http://localhost:5000/api/health
```

Check the frontend through its proxy:

```bash
curl -I http://localhost:5173/
curl http://localhost:5173/api/health
```

If the backend will not connect, verify `MONGODB_URI`, Atlas network access, database credentials, and that the URI is not surrounded by accidental quotes. If port `5000` or `5173` is already in use, stop the existing process or use another port.

## Testing Checklist

- `node backend/utils/streak.test.js`
- `node --check backend/server.js`
- `cd Frontend && npm run build`
- Login with the Ananya demo account
- Verify dashboard habits and morning reminder
- Complete and undo a habit
- Check streak and report updates
- Add, edit, search, archive, and restore a habit
- Open history, reports, profile, and authentication views
- Ignore one notification and clear all notifications
- Switch Light/Dark mode and refresh
- Verify no password hash is returned by login
- Verify MongoDB data remains after browser refresh when Atlas is configured

## Known Limitations

- Authentication is intentionally lightweight for the MVP: there are no JWTs, OAuth providers, email verification, or password reset flows.
- The in-memory fallback is not persistent and is only for local demonstration without MongoDB.
- Browser push notifications, email/SMS delivery, photo upload, advanced analytics, and complex calendar heatmaps are not included.
- Date calculations use the browser/server local date and are not yet timezone-configurable per user.
- The frontend is intentionally kept in a compact single-app component for the time-boxed challenge.

## Security Notes

- Secrets belong in environment variables and are ignored by git.
- Passwords are hashed with bcryptjs before MongoDB persistence.
- Password hashes are excluded from normal User queries and removed from auth responses.
- Habit completion endpoints validate habit ownership and duplicate completion records are blocked by the compound unique index.
- CORS allows local development origins and GitHub Codespaces frontend origins through `CLIENT_URL`/the configured Codespaces pattern.

## Future Improvements

- JWT or secure cookie sessions with refresh/revocation
- User-configurable timezone handling
- Browser notification permissions and scheduled delivery
- Password reset and email verification
- Photo/avatar upload
- Paginated history and richer analytics
- Calendar visualization and export
- Automated API integration and browser tests