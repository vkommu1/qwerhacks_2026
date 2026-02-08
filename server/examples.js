const UserDatabase = require('./userDatabase');
const fs = require('fs');

// Main async function to run examples
async function runExamples() {
    // Delete existing database to start fresh
    if (fs.existsSync('users.db')) {
        fs.unlinkSync('users.db');
        console.log('Deleted existing database');
    }
    
    // Initialize database
    const db = new UserDatabase('users.db');
    
    // Wait for tables to be created
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
        // ============================================
        // EXAMPLE 1: Adding Users
        // ============================================
        console.log('\n=== Adding Users ===');
        
        const user1Id = await db.addUser(
            'john_doe',
            'john@example.com',
            null, // password hash (you should use bcrypt in production)
            {
                signup_source: 'web',
                referrer: 'google',
                preferences: { theme: 'dark', notifications: true }
            }
        );
        
        const user2Id = await db.addUser(
            'jane_smith',
            'jane@example.com',
            null,
            { signup_source: 'mobile', referrer: 'direct' }
        );
        
        console.log('Created user 1 with ID:', user1Id);
        console.log('Created user 2 with ID:', user2Id);
        
        if (!user1Id || !user2Id) {
            throw new Error('Failed to create users');
        }
        
        // Try to add duplicate user (will return null)
        const duplicateId = await db.addUser('john_doe', 'john@example.com');
        console.log('Duplicate user attempt:', duplicateId); // null
        
        // ============================================
        // EXAMPLE 2: Getting Users
        // ============================================
        console.log('\n=== Getting Users ===');
        
        // Get by ID
        const userById = await db.getUser({ id: user1Id });
        console.log('User by ID:', userById);
        
        // Get by username
        const userByUsername = await db.getUser({ username: 'jane_smith' });
        console.log('User by username:', userByUsername);
        
        // Get by email
        const userByEmail = await db.getUser({ email: 'john@example.com' });
        console.log('User by email:', userByEmail);
        
        // Get all users
        const allUsers = await db.getAllUsers();
        console.log('All users count:', allUsers.length);
        
        // ============================================
        // EXAMPLE 3: Logging Activity
        // ============================================
        console.log('\n=== Logging Activity ===');
        
        // Log various activities
        await db.logActivity(user1Id, 'login', { ip: '192.168.1.1', device: 'Chrome' });
        await db.logActivity(user1Id, 'view_page', { page: '/dashboard', duration: 30 });
        await db.logActivity(user1Id, 'click_button', { button: 'submit', form: 'profile' });
        await db.logActivity(user1Id, 'upload_file', { filename: 'avatar.png', size: 1024 });
        
        await db.logActivity(user2Id, 'login', { ip: '192.168.1.2', device: 'Safari' });
        await db.logActivity(user2Id, 'view_page', { page: '/settings' });
        
        console.log('Activity logged successfully');
        
        // ============================================
        // EXAMPLE 4: Getting User Activity
        // ============================================
        console.log('\n=== Getting User Activity ===');
        
        const user1Activity = await db.getUserActivity(user1Id, 5);
        console.log('User 1 recent activity:');
        user1Activity.forEach(activity => {
            console.log(`  - [${activity.timestamp}] ${activity.action}:`, activity.details);
        });
        
        // ============================================
        // EXAMPLE 5: Updating Users
        // ============================================
        console.log('\n=== Updating Users ===');
        
        await db.updateUser(user1Id, {
            username: 'john_doe_updated',
            metadata: {
                signup_source: 'web',
                referrer: 'google',
                preferences: { theme: 'light', notifications: false },
                updated: true
            }
        });
        
        const updatedUser = await db.getUser({ id: user1Id });
        console.log('Updated user:', updatedUser.username);
        
        // ============================================
        // EXAMPLE 6: Update Last Login
        // ============================================
        console.log('\n=== Updating Last Login ===');
        
        await db.updateLastLogin(user1Id);
        const userWithLogin = await db.getUser({ id: user1Id });
        console.log('User last login:', userWithLogin.last_login);
        
        // ============================================
        // EXAMPLE 7: Search Users
        // ============================================
        console.log('\n=== Searching Users ===');
        
        const searchResults = await db.searchUsers('john');
        console.log('Search results for "john":', searchResults.length, 'found');
        
        // ============================================
        // EXAMPLE 8: Get User Statistics
        // ============================================
        console.log('\n=== User Statistics ===');
        
        const stats = await db.getUserStats(user1Id);
        console.log('User 1 stats:', stats);
        
        // ============================================
        // EXAMPLE 9: Get All Activity (Admin View)
        // ============================================
        console.log('\n=== All Activity (Admin View) ===');
        
        const allActivity = await db.getAllActivity(10);
        console.log('Recent activity across all users:');
        allActivity.forEach(activity => {
            console.log(`  - ${activity.username} [${activity.timestamp}] ${activity.action}`);
        });
        
        // ============================================
        // EXAMPLE 10: Delete User
        // ============================================
        console.log('\n=== Deleting User ===');
        
        const deleted = await db.deleteUser(user2Id);
        console.log('User 2 deleted:', deleted);
        
        const remainingUsers = await db.getAllUsers();
        console.log('Remaining users:', remainingUsers.length);
        
        console.log('\n✅ All examples completed successfully!');
        
    } catch (error) {
        console.error('❌ Error in examples:', error);
    } finally {
        // Close database connection
        await db.close();
    }
}

// Run the examples
runExamples().catch(console.error);