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
        setToken(storedToken);
        setCurrentUser(storedUser);
        setIsLoading(false);
    }, []);

    const login = async (email, password) => {
        const data = await AuthService.login(email, password);
        setToken(data.token);
        setCurrentUser(data.user);
        return data;
    };

    const logout = () => {
        AuthService.logout();
        setToken(null);
        setCurrentUser(null);
    };

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
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};