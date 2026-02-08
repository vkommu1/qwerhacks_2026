// src/contexts/UserContext.js
// React Context for managing user authentication state

import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, loginUser, logoutUser, registerUser, logActivity } from '../services/api';

const UserContext = createContext();

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const storedUser = getCurrentUser();
        setUser(storedUser);
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const userData = await loginUser(username, password);
            setUser(userData);
            return userData;
        } catch (error) {
            throw error;
        }
    };

    const register = async (username, email, password) => {
        try {
            const result = await registerUser(username, email, password);
            // After registration, log them in
            const userData = await loginUser(username, password);
            setUser(userData);
            return userData;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        logoutUser();
        setUser(null);
    };

    const trackActivity = (action, details) => {
        if (user) {
            logActivity(action, details);
        }
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        trackActivity,
        isAuthenticated: !!user,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Custom hook to use the UserContext
export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}

export default UserContext;
