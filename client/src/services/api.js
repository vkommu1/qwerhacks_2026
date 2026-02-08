// src/services/api.js
// API service to communicate with the backend database

const API_URL = 'http://localhost:3001/api';

// ============================================
// USER MANAGEMENT
// ============================================

export async function registerUser(username, email, password) {
    try {
        const response = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

export async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        // Store user in localStorage
        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        return data.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

export function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

export function logoutUser() {
    const user = getCurrentUser();
    if (user) {
        logActivity('logout');
    }
    localStorage.removeItem('user');
}

export async function updateUser(userId, updates) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Update failed');
        }
        
        // Update stored user
        const user = getCurrentUser();
        if (user) {
            const updatedUser = { ...user, ...updates };
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        return data;
    } catch (error) {
        console.error('Update error:', error);
        throw error;
    }
}

// ============================================
// ACTIVITY LOGGING
// ============================================

export async function logActivity(action, details = {}) {
    const user = getCurrentUser();
    
    if (!user) {
        console.warn('No user logged in, cannot log activity');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/activity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: user.id,
                action,
                details: {
                    ...details,
                    timestamp: new Date().toISOString(),
                },
            }),
        });
        
        if (!response.ok) {
            console.error('Failed to log activity');
        }
    } catch (error) {
        console.error('Activity logging error:', error);
    }
}

export async function getUserActivity(userId, limit = 10) {
    try {
        const response = await fetch(`${API_URL}/activity/${userId}?limit=${limit}`);
        
        if (!response.ok) {
            throw new Error('Failed to get activity');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Get activity error:', error);
        throw error;
    }
}

export async function getUserStats(userId) {
    try {
        const response = await fetch(`${API_URL}/stats/${userId}`);
        
        if (!response.ok) {
            throw new Error('Failed to get stats');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Get stats error:', error);
        throw error;
    }
}

// ============================================
// AUTOMATIC ACTIVITY TRACKING
// ============================================

// Track page views automatically
export function trackPageView(page) {
    logActivity('page_view', {
        page,
        referrer: document.referrer,
    });
}

// Track button clicks
export function trackButtonClick(buttonName, context = {}) {
    logActivity('button_click', {
        button: buttonName,
        ...context,
    });
}

// Track form submissions
export function trackFormSubmit(formName, context = {}) {
    logActivity('form_submit', {
        form: formName,
        ...context,
    });
}

// Track custom events
export function trackCustomEvent(eventName, details = {}) {
    logActivity(eventName, details);
}

export default {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    updateUser,
    logActivity,
    getUserActivity,
    getUserStats,
    trackPageView,
    trackButtonClick,
    trackFormSubmit,
    trackCustomEvent,
};
