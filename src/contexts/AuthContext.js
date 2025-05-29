// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AuthService from '../services/AuthService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(AuthService.getToken());
    const [currentUser, setCurrentUser] = useState(AuthService.getUser());
    const [isLoading, setIsLoading] = useState(true); // To track initial loading of auth state

    useEffect(() => {
        const storedToken = AuthService.getToken();
        const storedUser = AuthService.getUser();
        console.log('[AuthContext] Initial load. Token from localStorage:', storedToken);
        setToken(storedToken);
        setCurrentUser(storedUser);
        setIsLoading(false); // Set loading to false after attempting to load
    }, []);

    const login = async (email, password) => {
        const data = await AuthService.login(email, password);
        console.log('[AuthContext] Token set after login:', data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        // You might want to throw an error here if data.token is not received
        // to be caught by the LoginPage component for displaying an error.
        // Or handle it based on how AuthService.login behaves on failure.
        return data;
    };

    const logout = () => {
        AuthService.logout();
        setToken(null);
        setCurrentUser(null);
        console.log('[AuthContext] User logged out.');
        // Potentially navigate to login page here or let consuming components handle it
    };

    // Memoize isLoggedIn to stabilize its reference if used in dependency arrays
    const isLoggedIn = useCallback(() => {
        return !!token;
    }, [token]);

    return (
        <AuthContext.Provider value={{ token, currentUser, isLoading, isLoggedIn, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        // This typically means useAuth is used outside of AuthProvider
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};