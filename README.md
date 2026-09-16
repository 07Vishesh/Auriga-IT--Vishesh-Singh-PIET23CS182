# HabitFlow

## Overview

HabitFlow is a MongoDB-backed 75-day habit and routine tracker. It gives a user a focused daily dashboard, schedule-aware streaks, completion history, reminders, and simple profile management.

## Problem Statement

Self-improvement challenges are easier to sustain when today's habits are visible, progress is measurable, and non-daily schedules do not create false streak breaks.

## Features

- Demo user and five seeded habits on first database connection
- Daily and selected-weekday schedules
- Complete and undo today's habits with persistent HabitLog records
- Schedule-aware current and best streaks
- Add, edit, search, archive, and restore habits
- Completion history, 75-day progress, profile editing, and next reminder
- Responsive React interface with API error states

## Tech Stack

React, Vite, JavaScript, CSS, Node.js, Express, MongoDB Atlas, and Mongoose.

## Architecture

The Vite client calls the Express REST API. Express validates requests and delegates persistence to Mongoose models. Habit completion is stored separately in `HabitLog`, allowing history and streaks to be calculated without mutating the habit definition.

## Project Structure

```text
backend/                Express API, models, and streak utilities
Frontend/src/           React app, API client, and styles
.env.example            Backend environment template
REASONING.md            Design decisions
AI_LOGS.md              Conversation log placeholder
```

## MongoDB Setup

Create a MongoDB Atlas cluster and database user, then copy the connection string. The server creates the demo Ananya user and demo habits automatically when the database is empty. `HabitLog` has a unique compound index on `userId`, `habitId`, and `completionDate`.

## Environment Variables

Copy `.env.example` to `.env` and set `MONGODB_URI`. `PORT` defaults to `5000`; `CLIENT_URL` can contain the local or deployed frontend origin. The frontend defaults to `http://localhost:5000/api`; set `VITE_API_BASE_URL` in `Frontend/.env` only if the API is hosted elsewhere.

## Demo Login

Open `/login` and use the seeded demo account:

```text
Email: ananya@example.com
Password: Ananya@123
```

Passwords are bcrypt-hashed in MongoDB. When MongoDB is not configured for local UI work, the development fallback validates the same credentials in memory and clearly resets its data on restart.

## Installation

```bash
npm install
cd Frontend && npm install
```

## Running Backend

```bash
npm run dev
```

The API runs at `http://localhost:5000`.

## Running Frontend

In a second terminal:

```bash
cd Frontend
npm run dev
```

Open the Vite URL shown in the terminal. The client discovers the seeded demo user through `/api/demo`.

## API Endpoints

`POST/GET/PUT /api/users`, `GET/POST/PUT /api/habits`, `PATCH /api/habits/:id/archive`, `PATCH /api/habits/:id/restore`, `GET /api/habits/:id/logs`, `POST /api/habits/:id/complete`, `DELETE /api/habits/:id/complete/:date`, `GET /api/history`, and `GET /api/reports/:userId`.

## Streak Logic

`backend/utils/streak.js` checks whether a date is due before counting it. Daily habits inspect every calendar date; weekday habits skip non-scheduled dates. The current streak walks backward from today and the best streak walks from the first completion through the last, so month and year boundaries work naturally.

## Morning Habit Reminder

Each dashboard load dynamically checks active habits scheduled for the current local day against today's completion data. The dashboard reminder and notification bell show only scheduled habits that have not been completed; archived or already completed habits are excluded. Completing or undoing a habit refreshes the same data, so the reminder count stays consistent with Today's Progress. No duplicate reminder records are written to the database.

## Debugging

Check `GET /api/health`, confirm `MONGODB_URI`, and run `node backend/utils/streak.test.js`. API errors are shown in the client instead of crashing the page.

## Known Limitations

Authentication, browser notifications, photo upload, and advanced analytics are intentionally omitted from this time-boxed MVP.

## Future Improvements

Add authentication, timezone-aware date handling, notification permissions, richer history visualizations, and automated API integration tests.