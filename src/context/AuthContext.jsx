import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // 🔥 THE FIX: Initialize state from localStorage so it survives a refresh
    const [currentUser, setCurrentUser] = useState(() => {
        const savedUser = localStorage.getItem('openprix_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const login = async (username, password) => {
        const res = await window.api.db.verifyEmployeeLogin(username, password);
        if (res && res.token) {
            localStorage.setItem('openprix_token', res.token);
            localStorage.setItem('openprix_user', JSON.stringify(res.user));
            setCurrentUser(res.user);
            return true;
        }
        return false;
    };

    const logout = () => {
        localStorage.removeItem('openprix_token');
        localStorage.removeItem('openprix_user');
        setCurrentUser(null);
        window.location.reload(); // Hard reset to clear all states
    };

    // Helper to check clearance
    const hasClearance = (level) => {
        if (!currentUser) return false;
        // We renamed it to access_level in the Rust struct!
        return Number(currentUser.access_level) >= Number(level);
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout, hasClearance }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);