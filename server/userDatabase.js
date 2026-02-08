const sqlite3 = require('sqlite3').verbose();

class UserDatabase {
  constructor(dbPath = 'users.db') {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) console.error('Error opening database:', err);
      else console.log('Database initialized successfully');
    });

    this.db.run('PRAGMA foreign_keys = ON');

    this.ready = false;
    this.initPromise = this.createTables();
  }

  async ensureReady() {
    if (!this.ready) {
      await this.initPromise;
      this.ready = true;
    }
  }

  run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // ---- date helpers ----
  static formatDay(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getTodayKey() {
    return UserDatabase.formatDay(new Date());
  }

  getYesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return UserDatabase.formatDay(d);
  }

  async createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        metadata TEXT
      )
    `;

    const createActivityTable = `
      CREATE TABLE IF NOT EXISTS user_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_user_activity_user_id
      ON user_activity(user_id);

      CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp
      ON user_activity(timestamp);
    `;

    // ---- checklist tables ----
    const createChecklistDayTable = `
      CREATE TABLE IF NOT EXISTS checklist_day (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        day TEXT NOT NULL,
        checked_in INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        UNIQUE(user_id, day),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    const createChecklistItemsTable = `
      CREATE TABLE IF NOT EXISTS checklist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        day TEXT NOT NULL,
        action_id TEXT NOT NULL,
        done INTEGER DEFAULT 0,
        UNIQUE(user_id, day, action_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    const createChecklistIndexes = `
      CREATE INDEX IF NOT EXISTS idx_checklist_day_user_day
      ON checklist_day(user_id, day);

      CREATE INDEX IF NOT EXISTS idx_checklist_items_user_day
      ON checklist_items(user_id, day);
    `;
    // ---- NEW: custom checklist tasks (per user) ----
const createChecklistTasksTable = `
  CREATE TABLE IF NOT EXISTS checklist_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action_id TEXT NOT NULL,     -- unique string id
    label TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, action_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`;

const createChecklistTasksIndexes = `
  CREATE INDEX IF NOT EXISTS idx_checklist_tasks_user
  ON checklist_tasks(user_id);
`;



    try {
      await this.run(createUsersTable);
      await this.run(createActivityTable);
      await this.run(createIndexes);

      await this.run(createChecklistDayTable);
      await this.run(createChecklistItemsTable);
      await this.run(createChecklistIndexes);
      await this.run(createChecklistTasksTable);
      await this.run(createChecklistTasksIndexes);


      // ---- NUDGE: add columns (safe for existing DB) ----
      // these will throw if column already exists; we ignore
      await this.run(`ALTER TABLE users ADD COLUMN last_nudge_day TEXT`).catch(() => {});
      await this.run(`ALTER TABLE users ADD COLUMN nudge_opt_out INTEGER DEFAULT 0`).catch(() => {});
    } catch (error) {
      console.error('Error creating tables:', error);
    }
  }

  // ============================================
  // USERS
  // ============================================

  async addUser(username, email, passwordHash = null, metadata = null) {
    await this.ensureReady();

    const query = `
      INSERT INTO users (username, email, password_hash, metadata)
      VALUES (?, ?, ?, ?)
    `;

    try {
      const metadataJson = metadata ? JSON.stringify(metadata) : null;
      const result = await this.run(query, [username, email, passwordHash, metadataJson]);
      return result.lastID;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') return null;
      throw error;
    }
  }

  async getUser(criteria) {
    let query;
    let value;

    if (criteria.id) {
      query = 'SELECT * FROM users WHERE id = ?';
      value = criteria.id;
    } else if (criteria.username) {
      query = 'SELECT * FROM users WHERE username = ?';
      value = criteria.username;
    } else if (criteria.email) {
      query = 'SELECT * FROM users WHERE email = ?';
      value = criteria.email;
    } else {
      return null;
    }

    const user = await this.get(query, [value]);

    if (user && user.metadata) {
      try {
        user.metadata = JSON.parse(user.metadata);
      } catch {
        user.metadata = null;
      }
    }

    return user || null;
  }

  async getAllUsers(limit = 100, offset = 0) {
    const query = `
      SELECT id, username, email, created_at, last_login
      FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    return await this.all(query, [limit, offset]);
  }

  async updateUser(userId, updates) {
    const allowedFields = ['username', 'email', 'password_hash', 'metadata', 'last_nudge_day', 'nudge_opt_out'];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        values.push(key === 'metadata' ? JSON.stringify(value) : value);
      }
    }

    if (updateFields.length === 0) return false;

    values.push(userId);

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    try {
      const result = await this.run(query, values);
      if (result.changes > 0) {
        await this.logActivity(userId, 'user_updated', { fields: Object.keys(updates) });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  async deleteUser(userId) {
    const query = 'DELETE FROM users WHERE id = ?';
    const result = await this.run(query, [userId]);
    return result.changes > 0;
  }

  async updateLastLogin(userId) {
    const query = `
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await this.run(query, [userId]);
    await this.logActivity(userId, 'login');
  }


    // ============================================
    // CUSTOM CHECKLIST TASKS (per user)
    // ============================================

    async getCustomTasks(userId) {
    await this.ensureReady();
    return await this.all(
        `
        SELECT action_id, label
        FROM checklist_tasks
        WHERE user_id = ? AND active = 1
        ORDER BY created_at ASC
        `,
        [userId]
    );
    }

    async addCustomTask(userId, label) {
    await this.ensureReady();
    const trimmed = (label || "").trim();
    if (!trimmed) throw new Error("Task label cannot be empty");

    // generate a stable-ish id: custom_<timestamp>_<rand>
    const actionId = `custom_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    await this.run(
        `
        INSERT INTO checklist_tasks (user_id, action_id, label, active)
        VALUES (?, ?, ?, 1)
        `,
        [userId, actionId, trimmed]
    );

    await this.logActivity(userId, "custom_task_added", { actionId, label: trimmed });

    return { action_id: actionId, label: trimmed };
    }

    async deleteCustomTask(userId, actionId) {
    await this.ensureReady();
    const result = await this.run(
        `
        UPDATE checklist_tasks
        SET active = 0
        WHERE user_id = ? AND action_id = ?
        `,
        [userId, actionId]
    );

    if (result.changes > 0) {
        await this.logActivity(userId, "custom_task_deleted", { actionId });
        return true;
    }
    return false;
    }


  // ============================================
  // ACTIVITY
  // ============================================

  async logActivity(userId, action, details = null) {
    const query = `
      INSERT INTO user_activity (user_id, action, details)
      VALUES (?, ?, ?)
    `;
    const detailsJson = details ? JSON.stringify(details) : null;
    await this.run(query, [userId, action, detailsJson]);
  }

  async getUserActivity(userId, limit = 10) {
    const query = `
      SELECT *
      FROM user_activity
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    const activities = await this.all(query, [userId, limit]);

    return activities.map((activity) => {
      if (activity.details) {
        try {
          activity.details = JSON.parse(activity.details);
        } catch {
          activity.details = null;
        }
      }
      return activity;
    });
  }

  async getAllActivity(limit = 50) {
    const query = `
      SELECT ua.*, u.username, u.email
      FROM user_activity ua
      JOIN users u ON ua.user_id = u.id
      ORDER BY ua.timestamp DESC
      LIMIT ?
    `;
    const activities = await this.all(query, [limit]);

    return activities.map((activity) => {
      if (activity.details) {
        try {
          activity.details = JSON.parse(activity.details);
        } catch {
          activity.details = null;
        }
      }
      return activity;
    });
  }

  async getUserStats(userId) {
    const activityCountQuery = `
      SELECT COUNT(*) as total_actions
      FROM user_activity
      WHERE user_id = ?
    `;
    const lastActivityQuery = `
      SELECT action, timestamp
      FROM user_activity
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const activityCount = await this.get(activityCountQuery, [userId]);
    const lastActivity = await this.get(lastActivityQuery, [userId]);

    return {
      total_actions: activityCount.total_actions,
      last_activity: lastActivity || null
    };
  }

  async searchUsers(searchTerm) {
    const query = `
      SELECT id, username, email, created_at, last_login
      FROM users
      WHERE username LIKE ? OR email LIKE ?
      LIMIT 20
    `;
    const term = `%${searchTerm}%`;
    return await this.all(query, [term, term]);
  }

  // ============================================
  // CHECKLIST + STREAK
  // ============================================

  async ensureChecklistDay(userId, day) {
    await this.ensureReady();
    const query = `
      INSERT INTO checklist_day (user_id, day, checked_in, streak)
      VALUES (?, ?, 0, 0)
      ON CONFLICT(user_id, day) DO NOTHING
    `;
    await this.run(query, [userId, day]);
  }

  async getChecklistDay(userId, day) {
    await this.ensureReady();
    const query = `
      SELECT day, checked_in, streak
      FROM checklist_day
      WHERE user_id = ? AND day = ?
    `;
    return await this.get(query, [userId, day]);
  }

  async setChecklistItem(userId, day, actionId, done) {
    await this.ensureReady();
    const query = `
      INSERT INTO checklist_items (user_id, day, action_id, done)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, day, action_id)
      DO UPDATE SET done = excluded.done
    `;
    await this.run(query, [userId, day, actionId, done ? 1 : 0]);
  }

  // ============================================
// CUSTOM CHECKLIST TASKS
// ============================================

async getChecklistTasks(userId) {
  await this.ensureReady();
  return await this.all(
    `
    SELECT action_id, label
    FROM checklist_tasks
    WHERE user_id = ?
    ORDER BY created_at ASC
    `,
    [userId]
  );
}

async addChecklistTask(userId, label) {
  await this.ensureReady();

  // Create a stable-ish action_id
  const base = String(label)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const actionId = `custom_${base}_${Date.now()}`;

  await this.run(
    `
    INSERT INTO checklist_tasks (user_id, action_id, label)
    VALUES (?, ?, ?)
    `,
    [userId, actionId, label.trim()]
  );

  return { action_id: actionId, label: label.trim() };
}

async deleteChecklistTask(userId, actionId) {
  await this.ensureReady();
  const result = await this.run(
    `
    DELETE FROM checklist_tasks
    WHERE user_id = ? AND action_id = ?
    `,
    [userId, actionId]
  );
  return result.changes > 0;
}


  async getChecklistItems(userId, day) {
    await this.ensureReady();
    const query = `
      SELECT action_id, done
      FROM checklist_items
      WHERE user_id = ? AND day = ?
    `;
    return await this.all(query, [userId, day]);
  }

  async checkIn(userId) {
    await this.ensureReady();
    const today = this.getTodayKey();
    const yesterday = this.getYesterdayKey();

    await this.ensureChecklistDay(userId, today);

    const existingToday = await this.getChecklistDay(userId, today);
    if (existingToday && existingToday.checked_in === 1) {
      return { day: today, streak: existingToday.streak || 0, checkedInToday: true };
    }

    const yRow = await this.getChecklistDay(userId, yesterday);
    const yesterdayCheckedIn = yRow && yRow.checked_in === 1;
    const baseStreak = yesterdayCheckedIn ? (yRow.streak || 0) : 0;
    const newStreak = baseStreak + 1;

    await this.run(
      `UPDATE checklist_day SET checked_in = 1, streak = ? WHERE user_id = ? AND day = ?`,
      [newStreak, userId, today]
    );

    await this.logActivity(userId, 'checkin', { day: today, streak: newStreak });

    return { day: today, streak: newStreak, checkedInToday: true };
  }

  

  // ============================================
  // ---- NUDGE EMAIL SUPPORT ----
  // ============================================

  /**
   * Returns the most recent day the user checked in (checked_in = 1).
   * If they never checked in, returns null.
   */
  async getLastCheckInDay(userId) {
    await this.ensureReady();
    const row = await this.get(
      `
      SELECT day
      FROM checklist_day
      WHERE user_id = ? AND checked_in = 1
      ORDER BY day DESC
      LIMIT 1
      `,
      [userId]
    );
    return row ? row.day : null;
  }

  /**
   * Users eligible for a nudge today:
   * - have email
   * - not opted out
   * - have NOT checked in today
   * - have NOT been nudged today
   */
  async getUsersToNudge(todayStr) {
    await this.ensureReady();

    // Checked in today?
    // We'll LEFT JOIN checklist_day on today.
    const users = await this.all(
      `
      SELECT
        u.id,
        u.username,
        u.email,
        u.last_nudge_day,
        u.nudge_opt_out,
        cd.checked_in as checked_in_today
      FROM users u
      LEFT JOIN checklist_day cd
        ON cd.user_id = u.id AND cd.day = ?
      WHERE
        u.email IS NOT NULL
        AND u.email <> ''
        AND COALESCE(u.nudge_opt_out, 0) = 0
      `,
      [todayStr]
    );

    return users.filter((u) => {
      const checkedInToday = u.checked_in_today === 1;
      const nudgedToday = u.last_nudge_day === todayStr;
      return !checkedInToday && !nudgedToday;
    });
  }

  async markNudgedToday(userId, todayStr) {
    await this.ensureReady();
    await this.run(`UPDATE users SET last_nudge_day = ? WHERE id = ?`, [todayStr, userId]);
    await this.logActivity(userId, 'nudge_email_sent', { day: todayStr });
  }

  async setNudgeOptOut(userId, optOut) {
    await this.ensureReady();
    await this.run(`UPDATE users SET nudge_opt_out = ? WHERE id = ?`, [optOut ? 1 : 0, userId]);
  }

  // ============================================
  // CLOSE
  // ============================================

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }
}

module.exports = UserDatabase;
