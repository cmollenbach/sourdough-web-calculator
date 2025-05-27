// src/services/AuthService.js

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
const TOKEN_KEY = 'sourdoughToken';
const USER_KEY = 'sourdoughUser';

const AuthService = {
    async login(email, password) {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        if (data.token) {
            localStorage.setItem(TOKEN_KEY, data.token);
            if (data.user) {
                localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            }
        }
        return data; // Contains token, user, message, expiresIn
    },

    async register(email, password) {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        return data; // Contains message and user object (for registered user)
    },

    logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        // If you implement a backend logout endpoint, call it here too.
        // For example: await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', headers: this.getAuthHeader() });
        console.log("User logged out, token and user info removed.");
    },

    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    getUser() {
        const user = localStorage.getItem(USER_KEY);
        try {
            return user ? JSON.parse(user) : null;
        } catch (error) {
            console.error("Error parsing user from localStorage", error);
            return null;
        }
    },

    isLoggedIn() {
        const token = this.getToken();
        // Basic check: does a token exist?
        // You could add token expiry check here using a JWT decoding library (e.g., jwt-decode)
        // but true validation happens on the backend.
        return !!token; 
    },

    getAuthHeader() {
        const token = this.getToken();
        if (token) {
            return { 'Authorization': `Bearer ${token}` };
        } else {
            return {};
        }
    }
};

export default AuthService;