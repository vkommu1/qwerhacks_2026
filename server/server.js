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

// ============================================
// USER ROUTES
// ============================================

/**
 * POST /api/users/register
 * Register a new user
 */
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password, metadata } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email, and password are required'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user (NOTE: must await because addUser is async)
    const userId = await db.addUser(username, email, passwordHash, metadata);

    if (!userId) {
      return res.status(409).json({
        error: 'User already exists'
      });
    }

    // Log registration
    await db.logActivity(userId, 'registered', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      userId,
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users/login
 * User login
 */
app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // Get user (NOTE: must await because getUser is async)
    const user = await db.getUser({ username });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const validPassword = user.password_hash
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!validPassword) {
      // Log failed login attempt
      await db.logActivity(user.id, 'failed_login', {
        ip: req.ip,
        reason: 'invalid_password'
      });

      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Update last login (this function also logs 'login')
    await db.updateLastLogin(user.id);

    // Remove password hash from response
    delete user.password_hash;

    res.json({
      success: true,
      user,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = await db.getUser({ id: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data
    delete user.password_hash;

    res.json(user);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users
 * Get all users (with pagination)
 */
app.get('/api/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    const users = await db.getAllUsers(limit, offset);

    // Remove password hashes (shouldn't exist in getAllUsers select, but safe)
    users.forEach(u => delete u.password_hash);

    res.json({
      users,
      limit,
      offset
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id
 * Update user
 */
app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const updates = { ...req.body };

    // Don't allow direct password_hash updates (unless you intentionally want this)
    delete updates.password_hash;

    const success = await db.updateUser(userId, updates);

    if (!success) {
      return res.status(404).json({ error: 'User not found or no changes made' });
    }

    res.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user
 */
app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const success = await db.deleteUser(userId);

    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/search/:term
 * Search users
 */
app.get('/api/users/search/:term', async (req, res) => {
  try {
    const searchTerm = req.params.term;
    const users = await db.searchUsers(searchTerm);

    // Remove password hashes
    users.forEach(u => delete u.password_hash);

    res.json(users);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ACTIVITY ROUTES
// ============================================

/**
 * POST /api/activity
 * Log user activity
 */
app.post('/api/activity', async (req, res) => {
  try {
    const { userId, action, details } = req.body;

    if (!userId || !action) {
      return res.status(400).json({
        error: 'userId and action are required'
      });
    }

    await db.logActivity(userId, action, details);

    res.json({
      success: true,
      message: 'Activity logged'
    });

  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/activity/:userId
 * Get user activity
 */
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

/**
 * GET /api/activity
 * Get all activity (admin)
 */
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

/**
 * GET /api/stats/:userId
 * Get user statistics
 */
app.get('/api/stats/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const stats = await db.getUserStats(userId);

    res.json(stats);

  } catch (error) {
    console.error('Get stats error:', error);
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
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close();
  process.exit(0);
});

module.exports = app;
