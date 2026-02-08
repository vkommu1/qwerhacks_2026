const sqlite3 = require('sqlite3').verbose();

class UserDatabase {
    constructor(dbPath = 'users.db') {
        // Create database connection
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('Database initialized successfully');
            }
        });
        
        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
        
        // Flag to track if tables are ready
        this.ready = false;
        
        // Create tables
        this.initPromise = this.createTables();
    }
    
    // Helper to ensure database is ready
    async ensureReady() {
        if (!this.ready) {
            await this.initPromise;
            this.ready = true;
        }
    }
    
    // Helper to promisify run with proper context
    run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) reject(err);
                else resolve(this); // 'this' contains lastID and changes
            });
        });
    }
    
    // Helper to promisify get
    get(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
    
    // Helper to promisify all
    all(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
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
        
        try {
            await this.run(createUsersTable);
            await this.run(createActivityTable);
            await this.run(createIndexes);
        } catch (error) {
            console.error('Error creating tables:', error);
        }
    }
    
    /**
     * Add a new user to the database
     * @param {string} username - Username
     * @param {string} email - Email address
     * @param {string} passwordHash - Hashed password (optional)
     * @param {object} metadata - Additional user metadata (optional)
     * @returns {Promise<number|null>} User ID if successful, null if user exists
     */
    async addUser(username, email, passwordHash = null, metadata = null) {
        await this.ensureReady(); // Wait for tables to be created
        
        const query = `
            INSERT INTO users (username, email, password_hash, metadata) 
            VALUES (?, ?, ?, ?)
        `;
        
        try {
            const metadataJson = metadata ? JSON.stringify(metadata) : null;
            const result = await this.run(query, [username, email, passwordHash, metadataJson]);
            
            console.log('addUser result:', result); // DEBUG
            console.log('lastID:', result.lastID); // DEBUG
            
            return result.lastID;
        } catch (error) {
            console.error('addUser error:', error); // DEBUG
            if (error.code === 'SQLITE_CONSTRAINT') {
                console.error('User already exists:', username, email);
                return null;
            }
            throw error;
        }
    }
    
    /**
     * Get a user by ID, username, or email
     * @param {object} criteria - Search criteria {id, username, or email}
     * @returns {Promise<object|null>} User object or null if not found
     */
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
        
        // Parse metadata if it exists
        if (user && user.metadata) {
            try {
                user.metadata = JSON.parse(user.metadata);
            } catch (e) {
                user.metadata = null;
            }
        }
        
        return user || null;
    }
    
    /**
     * Get all users (with optional pagination)
     * @param {number} limit - Maximum number of users to return
     * @param {number} offset - Number of users to skip
     * @returns {Promise<array>} Array of user objects
     */
    async getAllUsers(limit = 100, offset = 0) {
        const query = `
            SELECT id, username, email, created_at, last_login 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        return await this.all(query, [limit, offset]);
    }
    
    /**
     * Update user information
     * @param {number} userId - User ID
     * @param {object} updates - Fields to update {username, email, metadata}
     * @returns {Promise<boolean>} True if successful
     */
    async updateUser(userId, updates) {
        const allowedFields = ['username', 'email', 'password_hash', 'metadata'];
        const updateFields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = ?`);
                values.push(key === 'metadata' ? JSON.stringify(value) : value);
            }
        }
        
        if (updateFields.length === 0) {
            return false;
        }
        
        values.push(userId);
        
        const query = `
            UPDATE users 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
        `;
        
        try {
            const result = await this.run(query, values);
            
            if (result.changes > 0) {
                await this.logActivity(userId, 'user_updated', {
                    fields: Object.keys(updates)
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating user:', error);
            return false;
        }
    }
    
    /**
     * Delete a user
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} True if successful
     */
    async deleteUser(userId) {
        const query = 'DELETE FROM users WHERE id = ?';
        const result = await this.run(query, [userId]);
        return result.changes > 0;
    }
    
    /**
     * Update last login timestamp
     * @param {number} userId - User ID
     * @returns {Promise<void>}
     */
    async updateLastLogin(userId) {
        const query = `
            UPDATE users 
            SET last_login = CURRENT_TIMESTAMP 
            WHERE id = ?
        `;
        
        await this.run(query, [userId]);
        await this.logActivity(userId, 'login');
    }
    
    /**
     * Log user activity
     * @param {number} userId - User ID
     * @param {string} action - Action performed
     * @param {object} details - Additional details (optional)
     * @returns {Promise<void>}
     */
    async logActivity(userId, action, details = null) {
        const query = `
            INSERT INTO user_activity (user_id, action, details) 
            VALUES (?, ?, ?)
        `;
        
        const detailsJson = details ? JSON.stringify(details) : null;
        await this.run(query, [userId, action, detailsJson]);
    }
    
    /**
     * Get user activity log
     * @param {number} userId - User ID
     * @param {number} limit - Maximum number of activities to return
     * @returns {Promise<array>} Array of activity objects
     */
    async getUserActivity(userId, limit = 10) {
        const query = `
            SELECT * FROM user_activity 
            WHERE user_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        `;
        
        const activities = await this.all(query, [userId, limit]);
        
        // Parse details JSON
        return activities.map(activity => {
            if (activity.details) {
                try {
                    activity.details = JSON.parse(activity.details);
                } catch (e) {
                    activity.details = null;
                }
            }
            return activity;
        });
    }
    
    /**
     * Get all activities for all users (admin feature)
     * @param {number} limit - Maximum number of activities
     * @returns {Promise<array>} Array of activity objects with user info
     */
    async getAllActivity(limit = 50) {
        const query = `
            SELECT 
                ua.*,
                u.username,
                u.email
            FROM user_activity ua
            JOIN users u ON ua.user_id = u.id
            ORDER BY ua.timestamp DESC
            LIMIT ?
        `;
        
        const activities = await this.all(query, [limit]);
        
        return activities.map(activity => {
            if (activity.details) {
                try {
                    activity.details = JSON.parse(activity.details);
                } catch (e) {
                    activity.details = null;
                }
            }
            return activity;
        });
    }
    
    /**
     * Get user statistics
     * @param {number} userId - User ID
     * @returns {Promise<object>} Statistics object
     */
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
    
    /**
     * Search users by username or email
     * @param {string} searchTerm - Search term
     * @returns {Promise<array>} Array of matching users
     */
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
    
    /**
     * Close database connection
     * @returns {Promise<void>}
     */
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