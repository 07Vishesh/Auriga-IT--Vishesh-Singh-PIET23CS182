import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  History,
  LayoutDashboard,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { api } from "./api";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const messages = [
  "Great job! Keep the streak alive!",
  "Another one done!",
  "You're staying consistent!",
  "Keep going!",
  "Small steps, big results!",
  "Another win for today!",
];
const today = () => new Date().toISOString().slice(0, 10);
const friendlyDate = (date) => {
  const day = new Date(`${date}T12:00:00`);
  const difference = Math.round(
    (new Date().setHours(12, 0, 0, 0) - day) / 86400000,
  );
  return difference === 0
    ? "Today"
    : difference === 1
      ? "Yesterday"
      : day.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
};
const navigate = (path) => { window.history.pushState({}, "", path); window.dispatchEvent(new PopStateEvent("popstate")); };

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [userId, setUserId] = useState(() => localStorage.getItem("habitflow-user-id") || "");
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [history, setHistory] = useState({});
  const [report, setReport] = useState(null);
  const [view, setView] = useState("today");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem("habitflow-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"),
  );
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState(() => {
    const key = `habitflow-dismissed-alerts-${localStorage.getItem("habitflow-user-id") || "guest"}-${today()}`;
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  });

  async function load(id = userId) {
    try {
      setLoading(true);
      setError("");
      const [nextUser, nextHabits, nextHistory, nextReport] = await Promise.all(
        [api.user(id), api.habits(id), api.history(id), api.report(id)],
      );
      setUser(nextUser);
      setHabits(nextHabits);
      setHistory(nextHistory);
      setReport(nextReport);
    } catch (err) {
      setError("Unable to load HabitFlow data. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  useEffect(() => {
    const routeView = { "/reports": "reports", "/history": "history", "/profile": "profile", "/archived": "archived", "/dashboard": "today" }[path];
    if (routeView) setView(routeView);
    if (userId && path === "/login") navigate("/dashboard");
    if (!userId && !["/login", "/register"].includes(path)) navigate("/login");
  }, [path, userId]);
  useEffect(() => { if (userId) load(); }, [userId]);
  useEffect(() => {
    if (!userId) return;
    const key = `habitflow-dismissed-alerts-${userId}-${today()}`;
    try { setDismissedAlertIds(JSON.parse(localStorage.getItem(key) || "[]")); } catch { setDismissedAlertIds([]); }
  }, [userId]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 2600);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("habitflow-theme", theme);
  }, [theme]);

  const todayHabits = useMemo(
    () =>
      habits.filter(
        (habit) =>
          !habit.archived &&
          (habit.scheduleType === "daily" ||
            habit.scheduledDays.includes(new Date().getDay())),
      ),
    [habits],
  );
  const activeHabits = todayHabits
    .filter((habit) => habit.name.toLowerCase().includes(search.toLowerCase()))
    .filter(
      (habit) =>
        filter === "all" ||
        (filter === "completed" ? habit.completedToday : !habit.completedToday),
    );
  const pendingHabits = todayHabits.filter((habit) => !habit.completedToday);
  const archived = habits.filter((habit) => habit.archived);
  const completed = todayHabits.filter((habit) => habit.completedToday).length;
  const challengeDay = Math.min(
    75,
    Math.max(
      1,
      Math.floor(
        (Date.now() -
          new Date(user?.challengeStartDate || Date.now()).getTime()) /
          86400000,
      ) + 1,
    ),
  );
  const nextReminder = todayHabits
    .filter((habit) => habit.reminderTime)
    .sort((a, b) => a.reminderTime.localeCompare(b.reminderTime))[0];
  const rawAlerts = useMemo(() => {
    const items = pendingHabits.length ? [{ id: `morning-${today()}-${pendingHabits.length}`, icon: "☀️", text: `Good morning! ${pendingHabits.length} habit${pendingHabits.length === 1 ? "" : "s"} still to complete today` }] : [];
    items.push(...pendingHabits
      .slice(0, 3)
      .map((habit) => ({
        id: `pending-habit-${habit._id}-${today()}`,
        icon: habit.currentStreak > 0 ? "🔥" : habit.icon,
        text:
          habit.currentStreak > 0
            ? `${habit.currentStreak}-day streak is at risk`
            : `${habit.name} is still pending`,
      })));
    if (nextReminder)
      items.push({
        id: `reminder-${nextReminder._id}-${today()}-${nextReminder.reminderTime}`,
        icon: "⏰",
        text: `${nextReminder.name} reminder at ${nextReminder.reminderTime}`,
      });
    items.push({ id: `challenge-progress-${today()}`, icon: "🎯", text: `You're on Day ${challengeDay} of 75` });
    return Array.from(new Map(items.map((item) => [item.id, item])).values()).slice(0, 5);
  }, [pendingHabits, nextReminder, challengeDay]);
  const alerts = useMemo(() => rawAlerts.filter((alert) => !dismissedAlertIds.includes(alert.id)), [rawAlerts, dismissedAlertIds]);

  function persistDismissed(ids) {
    const key = `habitflow-dismissed-alerts-${userId}-${today()}`;
    localStorage.setItem(key, JSON.stringify(ids));
    setDismissedAlertIds(ids);
  }
  function ignoreAlert(alertId) { persistDismissed(Array.from(new Set([...dismissedAlertIds, alertId]))); }
  function clearAllAlerts() { persistDismissed(Array.from(new Set([...dismissedAlertIds, ...rawAlerts.map((alert) => alert.id)]))); }

  async function toggle(habit) {
    if (busy) return;
    setBusy(true);
    try {
      if (habit.completedToday) await api.undo(habit._id, today());
      else {
        await api.complete(habit._id, userId);
        setToast(`🔥 ${messages[Math.floor(Math.random() * messages.length)]}`);
      }
      await load();
    } catch (err) {
      setError("Unable to update habit. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function saveHabit(form) {
    if (busy) return;
    setBusy(true);
    try {
      const payload = {
        ...form,
        userId,
        scheduledDays:
          form.scheduleType === "daily" ? [] : form.scheduledDays.map(Number),
      };
      if (modal?.habit) await api.updateHabit(modal.habit._id, payload);
      else await api.createHabit(payload);
      setModal(null);
      await load();
    } catch (err) {
      setError("Unable to save habit. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function archive(habit) {
    if (busy) return;
    setBusy(true);
    try {
      await api[habit.archived ? "restore" : "archive"](habit._id);
      setConfirmArchive(null);
      await load();
    } catch (err) {
      setError("Unable to update archive status. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function saveProfile(form) {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await api.updateUser(userId, form);
      setUser(updated);
      setModal(null);
      setToast("Profile updated");
    } catch (err) {
      setError("Unable to save profile. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function login(credentials) { try { setError(""); const loggedInUser = await api.login(credentials); localStorage.setItem("habitflow-user-id", loggedInUser._id); setUserId(loggedInUser._id); navigate("/dashboard"); } catch (err) { setError("Invalid email or password"); } }
  async function register(profile) { try { setError(""); const createdUser = await api.register(profile); localStorage.setItem("habitflow-user-id", createdUser._id); setUserId(createdUser._id); navigate("/dashboard"); } catch (err) { setError(err.message || "Unable to create profile"); } }
  function logout() { localStorage.removeItem("habitflow-user-id"); setUserId(""); setUser(null); navigate("/login"); }

  if (path === "/register") return <AuthPage mode="register" theme={theme} setTheme={setTheme} onSubmit={register} error={error} />;
  if (!userId || path === "/login") return <AuthPage mode="login" theme={theme} setTheme={setTheme} onSubmit={login} error={error} />;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">↗</span>
          <span>
            Habit<span>Flow</span>
          </span>
        </div>
        <div className="profile-mini">
          <div className="avatar">{user?.name?.[0] || "A"}</div>
          <div>
            <strong>{user?.name || "Ananya"}</strong>
            <small>75 day challenge</small>
          </div>
        </div>
        <nav>
          <NavButton
            icon={LayoutDashboard}
            label="Today"
            active={view === "today"}
            onClick={() => setView("today")}
          />
          <NavButton
            icon={BarChart3}
            label="Reports"
            active={view === "reports"}
            onClick={() => setView("reports")}
          />
          <NavButton
            icon={History}
            label="History"
            active={view === "history"}
            onClick={() => setView("history")}
          />
          <NavButton
            icon={Archive}
            label="Archived"
            active={view === "archived"}
            onClick={() => setView("archived")}
          />
          <NavButton
            icon={UserRound}
            label="Profile"
            active={view === "profile"}
            onClick={() => setView("profile")}
          />
        </nav>
        <div className="sidebar-foot">
          <Sparkles size={16} />
          <span>Consistency compounds.</span>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
            <h1>
              {view === "today"
                ? `Good morning, ${user?.name || "Ananya"}`
                : view[0].toUpperCase() + view.slice(1)}
            </h1>
          </div>
          <div className="header-actions">
            <button
              className="theme-toggle"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <>
                  <Moon size={16} /> Dark
                </>
              ) : (
                <>
                  <Sun size={16} /> Light
                </>
              )}
            </button>
            <div className="notification-wrap">
              <button
                className="notification-button"
                aria-label="Open notifications"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell size={19} />
                {alerts.length > 0 && (
                  <span className="notification-badge">{alerts.length}</span>
                )}
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <div className="notification-header"><strong>🔔 Notifications</strong><button className="notification-clear" onClick={clearAllAlerts} disabled={!alerts.length}>Clear All</button></div>
                  {alerts.length ? (
                    alerts.map((alert) => (
                      <div className="notification-item" key={alert.id}>
                        <p><span>{alert.icon}</span>{alert.text}</p>
                        <button className="notification-ignore" onClick={() => ignoreAlert(alert.id)}>Ignore</button>
                      </div>
                    ))
                  ) : (
                    <div className="notification-empty"><span>🔔</span><strong>You're all caught up!</strong><small>No new notifications.</small></div>
                  )}
                </div>
              )}
            </div>
            <button
              className="avatar button-avatar"
              onClick={() => setView("profile")}
              aria-label="Open profile"
            >
              {user?.name?.[0] || "A"}
            </button>
          </div>
        </header>
        {error && (
          <div className="error">
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {view === "today" && (
          <>
            <MorningReminder user={user} pendingHabits={pendingHabits} onView={() => document.querySelector(".habit-list")?.scrollIntoView({ behavior: "smooth" })} onAdd={() => setModal({})} />
            <section className="hero-grid">
              <div className="challenge panel">
                <div className="panel-label">
                  <Target size={16} /> CHALLENGE PROGRESS
                </div>
                <div className="challenge-row">
                  <div>
                    <strong>Day {challengeDay}</strong>
                    <span>/ 75</span>
                  </div>
                  <div className="progress-ring">
                    {Math.round((challengeDay / 75) * 100)}%
                  </div>
                </div>
                <div className="progress">
                  <span style={{ width: `${(challengeDay / 75) * 100}%` }} />
                </div>
                <div className="challenge-meta">
                  <span>{challengeDay >= 75 ? "Challenge Complete" : `${75 - challengeDay} days left`}</span>
                  <strong>{Math.round((challengeDay / 75) * 100)}% Complete</strong>
                </div>
                <div className="challenge-streaks">
                  <span>🔥 Active Streak <b>{report?.challengeActiveStreak || 0} days</b></span>
                  <span>🏆 Longest Streak <b>{report?.challengeLongestStreak || 0} days</b></span>
                </div>
              </div>
              <div className="progress-card panel">
                <div className="panel-label">
                  <Check size={16} /> TODAY'S PROGRESS
                </div>
                <div className="big-number">
                  {completed}
                  <span> / {todayHabits.length}</span>
                </div>
                <div className="today-percent">{todayHabits.length ? Math.round((completed / todayHabits.length) * 100) : 0}%</div>
                <p>
                  {!todayHabits.length
                    ? "No habits scheduled today"
                    : completed === todayHabits.length
                    ? "Everything checked off!"
                    : "Keep your rhythm going"}
                </p>
                <div className="progress">
                  <span
                    className="mint"
                    style={{
                      width: `${todayHabits.length ? (completed / todayHabits.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="reminder panel">
                <div className="panel-label">
                  <Bell size={16} /> UP NEXT
                </div>
                {nextReminder ? (
                  <>
                    <strong>
                      {nextReminder.icon} {nextReminder.name}
                    </strong>
                    <p>
                      <Clock3 size={14} /> {nextReminder.reminderTime}
                    </p>
                  </>
                ) : (
                  <p className="muted">No reminders set yet.</p>
                )}
              </div>
            </section>
            <section className="section-head">
              <div>
                <p className="eyebrow">YOUR ROUTINE</p>
                <h2>
                  Today's habits <span>{todayHabits.length}</span>
                </h2>
              </div>
              <div className="tools">
                <div className="search">
                  <Search size={17} />
                  <input
                    placeholder="Search habits..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search habits"
                  />
                </div>
                <button
                  className="primary"
                  onClick={() => setModal({})}
                  disabled={busy}
                >
                  <Plus size={18} /> Add habit
                </button>
              </div>
            </section>
            <div className="filter-row">
              {[
                ["all", "All"],
                ["completed", "Completed Today"],
                ["pending", "Pending"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filter === value ? "filter active" : "filter"}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="habit-list">
              {loading ? (
                <div className="empty">Loading...</div>
              ) : (
                activeHabits.map((habit) => (
                  <HabitCard
                    key={habit._id}
                    habit={habit}
                    busy={busy}
                    onToggle={() => toggle(habit)}
                    onEdit={() => setModal({ habit })}
                    onArchive={() => setConfirmArchive(habit)}
                  />
                ))
              )}
              {!loading && !activeHabits.length && (
                <div className="empty">
                  <strong>{search ? "🔍" : "🎉"}</strong>
                  <br />
                  {search
                    ? "No habits found."
                    : "No habits scheduled for today."}
                  <small>
                    {!search && "Enjoy your day or add a new habit."}
                  </small>
                </div>
              )}
            </div>
          </>
        )}
        {view === "reports" && <Report report={report} />}{" "}
        {view === "history" && <HistoryView history={history} />}{" "}
        {view === "archived" && (
          <Archived habits={archived} onRestore={archive} />
        )}{" "}
        {view === "profile" && (
          <Profile
            user={user}
            theme={theme}
            onEdit={() => setModal({ profile: true })}
            onLogout={logout}
          />
        )}
      </main>
      {modal &&
        (modal.profile ? (
          <ProfileForm
            user={user}
            onSave={saveProfile}
            onClose={() => setModal(null)}
          />
        ) : (
          <HabitForm
            habit={modal.habit}
            onSave={saveHabit}
            onClose={() => setModal(null)}
          />
        ))}
      {confirmArchive && (
        <ConfirmArchive
          habit={confirmArchive}
          onConfirm={() => archive(confirmArchive)}
          onClose={() => setConfirmArchive(null)}
        />
      )}{" "}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function MorningReminder({ user, pendingHabits, onView, onAdd }) {
  return <section className={pendingHabits.length ? "morning-reminder" : "morning-reminder complete"} aria-live="polite">
    <div className="morning-icon">{pendingHabits.length ? "☀️" : "🎉"}</div>
    <div className="morning-copy"><h2>{pendingHabits.length ? `Good morning, ${user?.name || "Ananya"}!` : "You're all caught up!"}</h2><p>{pendingHabits.length ? `You still have ${pendingHabits.length} habit${pendingHabits.length === 1 ? "" : "s"} to complete today.` : "You've completed all your habits for today. Keep your streak alive! 🔥"}</p>{pendingHabits.length > 0 && <div className="morning-habits">{pendingHabits.map(habit => <span key={habit._id}>{habit.icon} {habit.name}<small>Pending</small></span>)}</div>}</div><button className="secondary" onClick={pendingHabits.length ? onView : onAdd}>{pendingHabits.length ? "View Today's Habits" : "Add Your First Habit"}</button>
  </section>;
}

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button className={active ? "nav active" : "nav"} onClick={onClick}>
      <Icon size={18} />
      {label}
      {active && <ChevronRight size={15} />}
    </button>
  );
}
function HabitCard({ habit, busy, onToggle, onEdit, onArchive }) {
  return (
    <article className={habit.completedToday ? "habit completed" : "habit"}>
      <div className="habit-icon">{habit.icon}</div>
      <div className="habit-main">
        <h3>{habit.name}</h3>
        <p>
          {habit.scheduleType === "daily"
            ? "Every day"
            : habit.scheduledDays.map((day) => weekdays[day]).join(" · ")}
          {habit.reminderTime && (
            <>
              <span className="dot">·</span>
              <Clock3 size={13} /> {habit.reminderTime}
            </>
          )}
        </p>
        {!habit.completedToday && habit.currentStreak > 0 && (
          <small className="risk">
            🔥 Your {habit.currentStreak}-day streak is at risk
          </small>
        )}
      </div>
      <div className="streak">
        <strong>🔥 {habit.currentStreak}</strong>
        <small>current streak</small>
      </div>
      <div className="streak best">
        <strong>🏆 {habit.bestStreak}</strong>
        <small>best streak</small>
      </div>
      <button
        className={habit.completedToday ? "complete done" : "complete"}
        onClick={onToggle}
        disabled={busy}
        aria-label={
          habit.completedToday ? `Undo ${habit.name}` : `Complete ${habit.name}`
        }
      >
        {habit.completedToday ? (
          <>
            <Check size={16} /> Completed
          </>
        ) : (
          "Complete"
        )}
      </button>
      <button
        className="icon-button"
        title="Edit habit"
        onClick={onEdit}
        disabled={busy}
      >
        <Pencil size={17} />
      </button>
      <button
        className="icon-button"
        title="Archive habit"
        onClick={onArchive}
        disabled={busy}
      >
        <Archive size={17} />
      </button>
    </article>
  );
}
function HistoryView({ history }) {
  const dates = Object.keys(history);
  return (
    <section className="content-section">
      <p className="eyebrow">YOUR RECORD</p>
      <h2>Completed activities</h2>
      {!dates.length ? (
        <div className="empty">No completed activities yet.</div>
      ) : (
        <div className="history-list">
          {dates.map((date) => (
            <div className="history-day" key={date}>
              <div className="date-badge">
                {new Date(`${date}T12:00:00`).getDate()}
              </div>
              <div>
                <h3>{friendlyDate(date)}</h3>
                {history[date].map((log) => (
                  <p key={log._id}>
                    <Check size={15} /> {log.habitId?.icon}{" "}
                    {log.habitId?.name || "Habit"}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
function Archived({ habits, onRestore }) {
  return (
    <section className="content-section">
      <p className="eyebrow">OUT OF SIGHT, NOT GONE</p>
      <h2>Archived habits</h2>
      {!habits.length ? (
        <div className="empty">No archived habits.</div>
      ) : (
        <div className="habit-list">
          {habits.map((habit) => (
            <article className="habit archived" key={habit._id}>
              <div className="habit-icon">{habit.icon}</div>
              <div className="habit-main">
                <h3>{habit.name}</h3>
                <p>History preserved</p>
              </div>
              <button className="secondary" onClick={() => onRestore(habit)}>
                <RotateCcw size={16} /> Restore
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
function Report({ report }) {
  if (!report)
    return (
      <section className="content-section">
        <div className="empty">Loading report...</div>
      </section>
    );
  const insight = report.allTodayComplete
    ? "You've completed all of today's scheduled habits!"
    : report.overallCompletionRate >= 80
      ? "Excellent consistency! You're completing most of your scheduled habits."
      : report.overallCompletionRate >= 60
        ? "Good progress! Keep building consistency."
        : "Focus on completing your scheduled habits consistently.";
  return (
    <section className="content-section report-page">
      <p className="eyebrow">YOUR NUMBERS, HONESTLY</p>
      <h2>📊 Habit Performance Report</h2>
      <p className="report-subtitle">
        Your complete progress and consistency overview.
      </p>
      <div className="report-summary">
        <ReportMetric label="Total habits" value={report.totalHabits} />
        <ReportMetric label="Completed today" value={report.completedToday} />
        <ReportMetric
          label="Best current streak"
          value={`${report.currentBestStreak} days`}
        />
        <ReportMetric
          label="Overall completion"
          value={`${report.overallCompletionRate}%`}
        />
      </div>
      <div className="report-challenge panel">
        <div>
          <p className="eyebrow">75-DAY CHALLENGE</p>
          <h3>
            Day {report.challengeDay} <span>/ 75</span>
          </h3>
          <p>
            {report.challengeComplete
              ? "75-Day Challenge Complete 🎉"
              : `${report.daysRemaining} days remaining`}
          </p>
        </div>
        <div className="progress report-progress">
          <span style={{ width: `${(report.challengeDay / 75) * 100}%` }} />
        </div>
        <div className="report-days">
          <span>
            <strong>{report.daysCompleted}</strong> days completed
          </span>
          <span>
            <strong>{report.daysRemaining}</strong> days remaining
          </span>
        </div>
      </div>
      <div className="report-section">
        <p className="eyebrow">HABIT PERFORMANCE</p>
        <h3>Habit performance</h3>
        <div className="performance-grid">
          {report.habitPerformance.map((habit) => (
            <article className="performance-card" key={habit._id}>
              <div className="performance-title">
                <span>{habit.icon}</span>
                <strong>{habit.name}</strong>
              </div>
              <div className="performance-stats">
                <span>
                  🔥 Current <b>{habit.currentStreak}</b>
                </span>
                <span>
                  🏆 Best <b>{habit.bestStreak}</b>
                </span>
                <span>
                  ✓ Completions <b>{habit.totalCompletions}</b>
                </span>
                <span>
                  Rate <b>{habit.completionRate}%</b>
                </span>
              </div>
              <div className="progress">
                <span
                  className="mint"
                  style={{ width: `${habit.completionRate}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="report-columns">
        <div className="report-section">
          <p className="eyebrow">LAST 7 DAYS</p>
          <h3>Weekly overview</h3>
          <div className="week-list">
            {report.weeklyOverview.map((day) => (
              <div className="week-row" key={day.date}>
                <span>
                  {day.label}
                  <small>{day.date}</small>
                </span>
                <strong>
                  {day.completed} / {day.scheduled}
                </strong>
                <div className="progress">
                  <span style={{ width: `${day.completionRate}%` }} />
                </div>
                <b>{day.completionRate}%</b>
              </div>
            ))}
          </div>
        </div>
        <div className="report-section">
          <p className="eyebrow">CONSISTENCY</p>
          <h3>🔥 Streak summary</h3>
          <div className="streak-table">
            {report.habitPerformance.map((habit) => (
              <div key={habit._id}>
                <span>
                  {habit.icon} {habit.name}
                </span>
                <strong>🔥 {habit.currentStreak}</strong>
                <strong>🏆 {habit.bestStreak}</strong>
              </div>
            ))}
          </div>
          <div className="insight">
            <span>💡</span>
            <p>
              <strong>Your progress</strong>
              {insight}
            </p>
          </div>
        </div>
      </div>
      <div className="report-section">
        <p className="eyebrow">LATEST WINS</p>
        <h3>Recent activity</h3>
        {report.recentActivity.length ? (
          <div className="recent-list">
            {report.recentActivity.map((activity) => (
              <div key={activity._id}>
                <span>{friendlyDate(activity.completionDate)}</span>
                <strong>
                  {activity.habit?.icon} {activity.habit?.name || "Habit"}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No completed activities yet.</div>
        )}
      </div>
    </section>
  );
}
function ReportMetric({ label, value }) {
  return (
    <div className="report-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function AuthPage({ mode, theme, setTheme, onSubmit, error }) {
  const isRegister = mode === "register";
  const [form, setForm] = useState(isRegister ? { name: "", email: "", password: "", confirmPassword: "", wakeUpTime: "07:00", sleepTime: "22:30", exerciseTime: "18:00" } : { email: "", password: "" });
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = (event) => { event.preventDefault(); if (isRegister && form.password !== form.confirmPassword) return; onSubmit(form); };
  return <div className="auth-page"><div className="auth-toolbar"><button className="theme-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="Toggle theme">{theme === "light" ? <><Moon size={16}/> Dark</> : <><Sun size={16}/> Light</>}</button></div><div className="auth-card"><div className="brand auth-brand"><span className="brand-mark">↗</span><span>Habit<span>Flow</span></span></div><p className="eyebrow">{isRegister ? "START YOUR ROUTINE" : "WELCOME BACK"}</p><h1>{isRegister ? "Create your profile" : "Welcome back 👋"}</h1><p className="auth-subtitle">{isRegister ? "Set up your personal habit flow." : "Keep your streak moving forward."}</p>{error && <div className="error auth-error">{error}</div>}<form onSubmit={submit}>{isRegister && <label>Name<input name="name" value={form.name} onChange={update} required /></label>}<label>Email / Username<input name="email" type="email" value={form.email} onChange={update} placeholder="ananya@example.com" required /></label><label>Password<input name="password" type="password" value={form.password} onChange={update} required minLength="8" /></label>{isRegister && <><label>Confirm Password<input name="confirmPassword" type="password" value={form.confirmPassword} onChange={update} required minLength="8" /></label><div className="auth-routine"><label>Wake-up time<input name="wakeUpTime" type="time" value={form.wakeUpTime} onChange={update} /></label><label>Sleep time<input name="sleepTime" type="time" value={form.sleepTime} onChange={update} /></label><label>Exercise time<input name="exerciseTime" type="time" value={form.exerciseTime} onChange={update} /></label></div></>}<button className="primary wide">{isRegister ? "Create Profile" : "Login"}</button></form>{!isRegister && <div className="demo-account"><strong>Demo Account</strong><span>Email: ananya@example.com</span><span>Password: Ananya@123</span></div>}<p className="auth-switch">{isRegister ? "Already have an account?" : "Don't have an account?"} <button onClick={() => navigate(isRegister ? "/login" : "/register")}>{isRegister ? "Login" : "Create Profile"}</button></p></div></div>;
}

function Profile({ user, onEdit, theme, onLogout }) {
  return (
    <section className="content-section profile-view">
      <div className="profile-banner">
        <div className="avatar large">{user?.name?.[0]}</div>
        <div>
          <p className="eyebrow">YOUR DETAILS</p>
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
        </div>
        <button className="secondary" onClick={onEdit}>
          <Settings size={16} /> Edit profile
        </button>
        <button className="secondary logout-button" onClick={onLogout}>Logout</button>
      </div>
      <div className="details-grid">
        {[
          ["Wake-up time", user?.wakeUpTime],
          ["Sleep time", user?.sleepTime],
          ["Exercise time", user?.exerciseTime],
          [
            "Challenge started",
            user?.challengeStartDate &&
              new Date(user.challengeStartDate).toLocaleDateString(),
          ],
          ["Theme preference", theme === "dark" ? "🌙 Dark" : "☀️ Light"],
        ].map(([label, value]) => (
          <div className="detail" key={label}>
            <span>{label}</span>
            <strong>{value || "Not set"}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
function HabitForm({ habit, onSave, onClose }) {
  const [form, setForm] = useState({
    name: habit?.name || "",
    icon: habit?.icon || "✨",
    scheduleType: habit?.scheduleType || "daily",
    scheduledDays: habit?.scheduledDays || [],
    reminderTime: habit?.reminderTime || "",
  });
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleDay = (day) =>
    setForm({
      ...form,
      scheduledDays: form.scheduledDays.includes(day)
        ? form.scheduledDays.filter((value) => value !== day)
        : [...form.scheduledDays, day],
    });
  return (
    <Modal title={habit ? "Edit habit" : "Add a habit"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <label>
          Habit name
          <input
            name="name"
            value={form.name}
            onChange={change}
            required
            placeholder="e.g. Journal"
          />
        </label>
        <label>
          Icon
          <input
            name="icon"
            value={form.icon}
            onChange={change}
            maxLength="2"
          />
        </label>
        <label>
          Schedule
          <select
            name="scheduleType"
            value={form.scheduleType}
            onChange={change}
          >
            <option value="daily">Every day</option>
            <option value="weekdays">Selected weekdays</option>
          </select>
        </label>
        {form.scheduleType === "weekdays" && (
          <div className="day-picker">
            {weekdays.map((day, index) => (
              <button
                type="button"
                className={form.scheduledDays.includes(index) ? "selected" : ""}
                onClick={() => toggleDay(index)}
                key={day}
              >
                {day}
              </button>
            ))}
          </div>
        )}
        <label>
          Reminder time
          <input
            type="time"
            name="reminderTime"
            value={form.reminderTime}
            onChange={change}
          />
        </label>
        <button
          className="primary wide"
          disabled={
            form.scheduleType === "weekdays" && !form.scheduledDays.length
          }
        >
          {habit ? "Save changes" : "Add habit"}
        </button>
      </form>
    </Modal>
  );
}
function ProfileForm({ user, onSave, onClose }) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    wakeUpTime: user.wakeUpTime,
    sleepTime: user.sleepTime,
    exerciseTime: user.exerciseTime,
    challengeStartDate: user.challengeStartDate?.slice(0, 10),
  });
  return (
    <Modal title="Edit profile" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        {[
          ["name", "Name"],
          ["email", "Email"],
          ["wakeUpTime", "Wake-up time"],
          ["sleepTime", "Sleep time"],
          ["exerciseTime", "Exercise time"],
          ["challengeStartDate", "Challenge start date"],
        ].map(([name, label]) => (
          <label key={name}>
            {label}
            <input
              type={
                name.includes("Time")
                  ? "time"
                  : name === "challengeStartDate"
                    ? "date"
                    : name === "email"
                      ? "email"
                      : "text"
              }
              name={name}
              value={form[name] || ""}
              onChange={(e) => setForm({ ...form, [name]: e.target.value })}
              required
            />
          </label>
        ))}
        <button className="primary wide">Save profile</button>
      </form>
    </Modal>
  );
}
function ConfirmArchive({ habit, onConfirm, onClose }) {
  return (
    <Modal title="Archive this habit?" onClose={onClose}>
      <p className="modal-copy">Your completion history will be preserved.</p>
      <div className="modal-actions">
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="primary" onClick={onConfirm}>
          Archive
        </button>
      </div>
    </Modal>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default App;
