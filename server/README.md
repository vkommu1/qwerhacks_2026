# SQLite User Database for Node.js

A complete SQLite database implementation for logging user information and activity in Node.js.

## Features

✅ User registration and authentication
✅ Activity logging and tracking
✅ User search and statistics
✅ RESTful API with Express.js
✅ Password hashing with bcrypt
✅ Automatic database initialization
✅ Full CRUD operations

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `better-sqlite3` - Fast SQLite3 library
- `express` - Web framework
- `bcrypt` - Password hashing

### 2. Run Examples

Test the database functionality:

```bash
npm test
```

This runs `examples.js` which demonstrates all database operations.

### 3. Start the API Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

Server will start on `http://localhost:3001`

## File Structure

```
├── userDatabase.js    # Main database class
├── server.js          # Express API server
├── examples.js        # Usage examples
├── package.json       # Dependencies
└── users.db          # SQLite database (created automatically)
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    metadata TEXT
);
```

### User Activity Table
```sql
CREATE TABLE user_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## API Endpoints

### User Management

#### Register User
```bash
POST /api/users/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "metadata": {
    "signup_source": "web"
  }
}
```

#### Login
```bash
POST /api/users/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securepassword123"
}
```

#### Get User by ID
```bash
GET /api/users/:id
```

#### Get All Users
```bash
GET /api/users?limit=10&offset=0
```

#### Update User
```bash
PUT /api/users/:id
Content-Type: application/json

{
  "username": "new_username",
  "metadata": { "theme": "dark" }
}
```

#### Delete User
```bash
DELETE /api/users/:id
```

#### Search Users
```bash
GET /api/users/search/:term
```

### Activity Tracking

#### Log Activity
```bash
POST /api/activity
Content-Type: application/json

{
  "userId": 1,
  "action": "view_page",
  "details": {
    "page": "/dashboard",
    "duration": 30
  }
}
```

#### Get User Activity
```bash
GET /api/activity/:userId?limit=10
```

#### Get All Activity (Admin)
```bash
GET /api/activity?limit=50
```

#### Get User Statistics
```bash
GET /api/stats/:userId
```

## Usage in Your Code

### Basic Usage

```javascript
const UserDatabase = require('./userDatabase');

// Initialize database
const db = new UserDatabase('users.db');

// Add a user
const userId = db.addUser(
    'username',
    'email@example.com',
    hashedPassword,
    { signup_source: 'web' }
);

// Get user
const user = db.getUser({ id: userId });

// Log activity
db.logActivity(userId, 'login', { ip: '192.168.1.1' });

// Get activity
const activities = db.getUserActivity(userId, 10);

// Close database when done
db.close();
```

### With Express.js

```javascript
const express = require('express');
const UserDatabase = require('./userDatabase');

const app = express();
const db = new UserDatabase();

app.use(express.json());

app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    
    // Hash password first (use bcrypt)
    const userId = db.addUser(username, email, passwordHash);
    
    if (!userId) {
        return res.status(400).json({ error: 'User exists' });
    }
    
    res.json({ success: true, userId });
});

app.listen(3001);
```

## Testing with cURL

### Register a user
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### Get user activity
```bash
curl http://localhost:3001/api/activity/1
```

## Testing with Postman

1. Import the following requests into Postman
2. Set the base URL to `http://localhost:3001`
3. Use the examples above for request bodies

## Available Methods

### UserDatabase Class

| Method | Description |
|--------|-------------|
| `addUser(username, email, passwordHash, metadata)` | Create new user |
| `getUser({id, username, email})` | Get user by criteria |
| `getAllUsers(limit, offset)` | Get all users with pagination |
| `updateUser(userId, updates)` | Update user information |
| `deleteUser(userId)` | Delete user |
| `updateLastLogin(userId)` | Update last login timestamp |
| `logActivity(userId, action, details)` | Log user activity |
| `getUserActivity(userId, limit)` | Get user's activity log |
| `getAllActivity(limit)` | Get all users' activity |
| `getUserStats(userId)` | Get user statistics |
| `searchUsers(searchTerm)` | Search users by username/email |
| `close()` | Close database connection |

## Security Best Practices

1. **Password Hashing**: Always use bcrypt to hash passwords
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 10);
```

2. **Input Validation**: Validate all user inputs
```javascript
if (!username || !email) {
    throw new Error('Required fields missing');
}
```

3. **SQL Injection**: The library uses prepared statements automatically

4. **Environment Variables**: Store sensitive config in `.env`
```
DB_PATH=./data/users.db
PORT=3001
```

## Customization

### Add Custom Fields

Edit the `CREATE TABLE` statement in `userDatabase.js`:

```javascript
this.db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,              -- Add phone field
        country TEXT,            -- Add country field
        -- ... other fields
    );
`);
```

### Add Custom Activity Types

Just log with descriptive action names:

```javascript
db.logActivity(userId, 'purchase', { 
    item: 'Product Name',
    amount: 99.99 
});

db.logActivity(userId, 'message_sent', { 
    to: 'user123',
    message_length: 150 
});
```

## Troubleshooting

### Database locked error
- Close other connections: `db.close()`
- Use WAL mode: `db.pragma('journal_mode = WAL')`

### Module not found
- Run `npm install` to install dependencies

### Permission errors
- Check file permissions on `users.db`
- Ensure write access to the directory

## Production Considerations

1. **Backup**: Regular database backups
```bash
cp users.db users_backup_$(date +%Y%m%d).db
```

2. **Indexing**: Already included for performance
3. **Connection pooling**: For high traffic, consider `better-sqlite3` in cluster mode
4. **Migrations**: Use a migration tool for schema changes

## License

MIT

## Support

For issues or questions, open an issue on GitHub.
