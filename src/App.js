// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import RecipeCalculator from './RecipeCalculator';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import './App.css';

function AppContent() {
    const { token, currentUser, isLoading, logout } = useAuth();

    if (isLoading) {
        return <div className="loading-app">Loading Application...</div>;
    }

    return (
        <>
            <nav>
                <ul className="main-nav-list"> {/* Added a class for more specific targeting */}
                    <li className="nav-item-left">
                        <NavLink
                            to="/"
                            className={({ isActive }) => isActive ? "active" : ""}
                        >
                            Calculator
                        </NavLink>
                    </li>

                    {/* Center item: Welcome message (only when logged in) */}
                    <li className="nav-item-center">
                        {token && currentUser && (
                            <span>Welcome, {currentUser.username || currentUser.email}!</span>
                        )}
                    </li>

                    <li className="nav-item-right">
                        {!token ? (
                            <>
                                <NavLink
                                    to="/login"
                                    className={({ isActive }) => isActive ? "active" : ""}
                                >
                                    Login
                                </NavLink>
                                <NavLink
                                    to="/register"
                                    className={({ isActive }) => isActive ? "active" : ""}
                                >
                                    Register
                                </NavLink>
                            </>
                        ) : (
                            <button onClick={logout}>Logout</button>
                        )}
                    </li>
                </ul>
            </nav>
            <main>
                <Routes>
                    <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" />} />
                    <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to="/" />} />
                    <Route
                        path="/"
                        element={token ? <RecipeCalculator /> : <Navigate to="/login" replace />}
                    />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
        </>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <DataProvider>
                    <div className="App">
                        <h1 className="app-title">Sourdough Recipe Calculator</h1>
                        <AppContent />
                    </div>
                </DataProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;