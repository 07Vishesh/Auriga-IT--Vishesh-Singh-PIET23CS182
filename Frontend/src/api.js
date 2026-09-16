const API = import.meta.env.VITE_API_BASE_URL || '/api';
async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}
export const api = {
  login: credentials => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: profile => request('/auth/register', { method: 'POST', body: JSON.stringify(profile) }),
  demo: () => request('/demo'),
  user: id => request(`/users/${id}`),
  habits: userId => request(`/habits?userId=${userId}`),
  createHabit: habit => request('/habits', { method: 'POST', body: JSON.stringify(habit) }),
  updateHabit: (id, habit) => request(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(habit) }),
  archive: id => request(`/habits/${id}/archive`, { method: 'PATCH' }),
  restore: id => request(`/habits/${id}/restore`, { method: 'PATCH' }),
  complete: (id, userId) => request(`/habits/${id}/complete`, { method: 'POST', body: JSON.stringify({ userId }) }),
  undo: (id, date) => request(`/habits/${id}/complete/${date}`, { method: 'DELETE' }),
  history: userId => request(`/history?userId=${userId}`),
  report: userId => request(`/reports/${userId}`),
  updateUser: (id, user) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(user) })
};
