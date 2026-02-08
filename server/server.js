const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const UserDatabase = require('./userDatabase');

const app = express();
const db = new UserDatabase('users.db');

// CORS configuration - allow requests from your frontend
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*', // In production, set FRONTEND_URL env variable
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());


async function requireUser(req, res) {
  const userId = (req.body && req.body.userId) || (req.params && req.params.userId);
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
// ROOT ROUTE
// ============================================

app.get('/', (req, res) => {
    res.json({
        message: 'QwerHacks 2026 API Server',
        status: 'running',
        endpoints: {
            users: '/api/users',
            login: '/api/users/login',
            register: '/api/users/register',
            activity: '/api/activity'
        },
        documentation: 'https://github.com/your-repo'
    });
});

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
        
        // Create user
        const userId = await db.addUser(username, email, passwordHash, metadata);
        
        if (!userId) {
            return res.status(409).json({
                error: 'User already exists'
            });
        }
        
        // Log registration
        db.logActivity(userId, 'registered', {
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
        
        // Get user
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
            db.logActivity(user.id, 'failed_login', {
                ip: req.ip,
                reason: 'invalid_password'
            });
            
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }
        
        // Update last login
        await db.updateLastLogin(user.id);
        
        // Log successful login
        await db.logActivity(user.id, 'login', {
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
        
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
app.get('/api/users/:id', (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = db.getUser({ id: userId });
        
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
app.get('/api/users', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        
        const users = db.getAllUsers(limit, offset);
        
        // Remove password hashes
        users.forEach(user => delete user.password_hash);
        
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
app.put('/api/users/:id', (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const updates = req.body;
        
        // Don't allow direct password_hash updates
        delete updates.password_hash;
        
        const success = db.updateUser(userId, updates);
        
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
app.delete('/api/users/:id', (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const success = db.deleteUser(userId);
        
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
app.get('/api/users/search/:term', (req, res) => {
    try {
        const searchTerm = req.params.term;
        const users = db.searchUsers(searchTerm);
        
        // Remove password hashes
        users.forEach(user => delete user.password_hash);
        
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
app.post('/api/activity', (req, res) => {
    try {
        const { userId, action, details } = req.body;
        
        if (!userId || !action) {
            return res.status(400).json({
                error: 'userId and action are required'
            });
        }
        
        db.logActivity(userId, action, details);
        
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
app.get('/api/activity/:userId', (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const limit = parseInt(req.query.limit) || 10;
        
        const activities = db.getUserActivity(userId, limit);
        
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
app.get('/api/activity', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const activities = db.getAllActivity(limit);
        
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
app.get('/api/stats/:userId', (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const stats = db.getUserStats(userId);
        
        res.json(stats);
        
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// CHECKLIST ROUTES (LOGGED-IN ONLY)
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
      items,
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


/**
 * GET /api/checklist/tasks/:userId
 * Returns user's custom tasks
 * -> { tasks: [{action_id, label}] }
 */
app.get("/api/checklist/tasks/:userId", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const tasks = await db.getChecklistTasks(userId);
    res.json({ tasks });
  } catch (e) {
    console.error("Get tasks error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/checklist/tasks
 * body: { userId, label }
 */
app.post("/api/checklist/tasks", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const { label } = req.body;
    if (!label || !String(label).trim()) {
      return res.status(400).json({ error: "Missing label" });
    }

    const task = await db.addChecklistTask(userId, label);
    res.json({ success: true, task });
  } catch (e) {
    console.error("Add task error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});

/**
 * DELETE /api/checklist/tasks/:userId/:actionId
 * soft-deletes a custom task
 */
app.delete("/api/checklist/tasks/:userId/:actionId", async (req, res) => {
  try {
    const userId = await requireUser(req, res);
    if (!userId) return;

    const { actionId } = req.params;
    const ok = await db.deleteChecklistTask(userId, actionId);

    if (!ok) return res.status(404).json({ error: "Task not found" });

    res.json({ success: true });
  } catch (e) {
    console.error("Delete task error:", e);
    res.status(500).json({ error: "Internal server error" });
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
    console.log(`API available at http://localhost:${PORT}/api`);
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