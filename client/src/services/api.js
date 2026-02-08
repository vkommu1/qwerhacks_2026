// src/services/api.js
// API service to communicate with the backend database

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ============================================
// USER MANAGEMENT
// ============================================

export async function registerUser(username, email, password) {
  const response = await fetch(`${API_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

export async function loginUser(username, password) {
  const response = await fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Login failed');

  if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  return data.user;
}

export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export function logoutUser() {
  const user = getCurrentUser();
  if (user) logActivity('logout');
  localStorage.removeItem('user');
}

export async function updateUser(userId, updates) {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Update failed');

  const user = getCurrentUser();
  if (user) localStorage.setItem('user', JSON.stringify({ ...user, ...updates }));

  return data;
}

// ============================================
// CHECKLIST (LOGGED-IN ONLY)
// ============================================

function requireLoggedInUser() {
  const user = getCurrentUser();
  if (!user || !user.id) {
    throw new Error('Please log in to use the checklist.');
  }
  return user;
}

export async function getTodayChecklist() {
  const user = requireLoggedInUser();

  const response = await fetch(`${API_URL}/checklist/today/${user.id}`);
  const data = await response.json();

  if (!response.ok) throw new Error(data.error || 'Failed to load checklist');
  return data; // {day, checkedInToday, streak, items:[{action_id, done}]}
}

export async function setChecklistItem(actionId, done) {
  const user = requireLoggedInUser();

  const response = await fetch(`${API_URL}/checklist/item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id, actionId, done }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to save item');
  return data;
}

export async function checkInToday() {
  const user = requireLoggedInUser();

  const response = await fetch(`${API_URL}/checklist/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Check-in failed');
  return data; // {success:true, day, streak, checkedInToday:true}
}

// ============================================
// ACTIVITY LOGGING
// ============================================

export async function logActivity(action, details = {}) {
  const user = getCurrentUser();
  if (!user) return;

  try {
    const response = await fetch(`${API_URL}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        action,
        details: { ...details, timestamp: new Date().toISOString() },
      }),
    });

    if (!response.ok) console.error('Failed to log activity');
  } catch (error) {
    console.error('Activity logging error:', error);
  }
}

export async function getUserActivity(userId, limit = 10) {
  const response = await fetch(`${API_URL}/activity/${userId}?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to get activity');
  return await response.json();
}

export async function getUserStats(userId) {
  const response = await fetch(`${API_URL}/stats/${userId}`);
  if (!response.ok) throw new Error('Failed to get stats');
  return await response.json();
}

// ============================================
// AUTOMATIC ACTIVITY TRACKING
// ============================================

export function trackPageView(page) {
  logActivity('page_view', { page, referrer: document.referrer });
}

export function trackButtonClick(buttonName, context = {}) {
  logActivity('button_click', { button: buttonName, ...context });
}

export function trackFormSubmit(formName, context = {}) {
  logActivity('form_submit', { form: formName, ...context });
}

export function trackCustomEvent(eventName, details = {}) {
  logActivity(eventName, details);
}

export default {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUser,
  // checklist
  getTodayChecklist,
  setChecklistItem,
  checkInToday,
  // activity
  logActivity,
  getUserActivity,
  getUserStats,
  trackPageView,
  trackButtonClick,
  trackFormSubmit,
  trackCustomEvent,
};
