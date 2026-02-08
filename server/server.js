// server.js
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const UserDatabase = require('./userDatabase');

const app = express();
const db = new UserDatabase('users.db');

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Helper: require logged-in user (we validate user exists in DB)
async function requireUser(req, res) {
  const userId = req.body.userId || req.params.userId;
  const id = parseInt(userId, 10);

  if (!id) {
    res.status(401).json({ error: 'Not logged in' });
    return null;
  }

  const user = await db.getUser({ id });
  if (!user) {
    res.status(401).json({ error: 'Not logged in' });
    return null;
  }

  return id;
}

// ============================================
// USER ROUTES
// ============================================

app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password, metadata } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await db.addUser(username, email, passwordHash, metadata);

    if (!userId) {
      return res.status(409).json({ error: 'User already exists' });
    }

    await db.logActivity(userId, 'registered', { ip: req.ip, userAgent: req.get('user-agent') });

    res.status(201).json({ success: true, userId, message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.getUser({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    if (!validPassword) {
      await db.logActivity(user.id, 'failed_login', { ip: req.ip, reason: 'invalid_password' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await db.updateLastLogin(user.id);
    delete user.password_hash;

    res.json({ success: true, user, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = await db.getUser({ id: userId });

    if (!user) return res.status(404).json({ error: 'User not found' });

    delete user.password_hash;
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    const users = await db.getAllUsers(limit, offset);
    users.forEach((u) => delete u.password_hash);

    res.json({ users, limit, offset });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const updates = { ...req.body };
    delete updates.password_hash;

    const success = await db.updateUser(userId, updates);
    if (!success) return res.status(404).json({ error: 'User not found or no changes made' });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const success = await db.deleteUser(userId);
    if (!success) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/search/:term', async (req, res) => {
  try {
    const users = await db.searchUsers(req.params.term);
    users.forEach((u) => delete u.password_hash);
    res.json(users);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ACTIVITY ROUTES
// ============================================

app.post('/api/activity', async (req, res) => {
  try {
    const { userId, action, details } = req.body;
    if (!userId || !action) return res.status(400).json({ error: 'userId and action are required' });

    await db.logActivity(userId, action, details);
    res.json({ success: true, message: 'Activity logged' });
  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/activity/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const limit = parseInt(req.query.limit, 10) || 10;

    const activities = await db.getUserActivity(userId, limit);
    res.json(activities);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const activities = await db.getAllActivity(limit);
    res.json(activities);
  } catch (error) {
    console.error('Get all activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats/:userId', async (req, res) => {
  try {
    const stats = await db.getUserStats(parseInt(req.params.userId, 10));
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// NEW: CHECKLIST ROUTES (LOGGED-IN ONLY)
// ============================================

/**
 * GET /api/checklist/today/:userId
 * Returns { day, checkedInToday, streak, items:[{action_id, done}] }
 */
app.get('/api/checklist/today/:userId', async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const day = db.getTodayKey();
    await db.ensureChecklistDay(userId, day);

    const dayRow = await db.getChecklistDay(userId, day);
    const items = await db.getChecklistItems(userId, day);

    res.json({
      day,
      checkedInToday: dayRow ? dayRow.checked_in === 1 : false,
      streak: dayRow ? dayRow.streak : 0,
      items
    });
  } catch (e) {
    console.error('Get checklist today error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/checklist/item
 * body: { userId, actionId, done }
 */
app.post('/api/checklist/item', async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const { actionId, done } = req.body;
    if (!actionId) return res.status(400).json({ error: 'Missing actionId' });

    const day = db.getTodayKey();
    await db.ensureChecklistDay(userId, day);
    await db.setChecklistItem(userId, day, actionId, !!done);

    res.json({ success: true });
  } catch (e) {
    console.error('Set checklist item error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/checklist/checkin
 * body: { userId }
 */
app.post('/api/checklist/checkin', async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const day = db.getTodayKey();
    const items = await db.getChecklistItems(userId, day);
    const didSomething = items.some((i) => i.done === 1);

    if (!didSomething) {
      return res.status(400).json({ error: 'Pick at least one action before check-in' });
    }

    const result = await db.checkIn(userId);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('Checkin error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('API endpoints:');
  console.log('  POST   /api/users/register');
  console.log('  POST   /api/users/login');
  console.log('  GET    /api/users');
  console.log('  GET    /api/users/:id');
  console.log('  PUT    /api/users/:id');
  console.log('  DELETE /api/users/:id');
  console.log('  GET    /api/users/search/:term');
  console.log('  POST   /api/activity');
  console.log('  GET    /api/activity/:userId');
  console.log('  GET    /api/activity');
  console.log('  GET    /api/stats/:userId');
  console.log('  GET    /api/checklist/today/:userId');
  console.log('  POST   /api/checklist/item');
  console.log('  POST   /api/checklist/checkin');
});

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close();
  process.exit(0);
});

module.exports = app;
