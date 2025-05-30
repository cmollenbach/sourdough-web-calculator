// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import RecipeCalculator from './RecipeCalculator';
import PublicRecipeCalculatorView from './components/PublicRecipeCalculatorView';
import GuidedBakePage from './components/GuidedBakePage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
// Import ToastProvider and ToastContainer
import { ToastProvider } from './contexts/ToastContext'; // Make sure this path is correct
import ToastContainer from './components/common/ToastContainer'; // Make sure this path is correct
import './App.css';

function AppContent() {
    const { token, currentUser, isLoading, logout } = useAuth();

    if (isLoading) {
        return <div className="loading-app">Loading Application...</div>;
    }

    return (
        <>
            <nav>
                <ul className="main-nav-list">
                    <li className="nav-item-left">
                        <NavLink
                            to={token ? "/" : "/public-calculator"}
                            className={({ isActive }) => isActive ? "active" : ""}
                        >
                            Calculator
                        </NavLink>
                    </li>

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
                    {/* Public Routes */}
                    <Route
                        path="/public-calculator"
                        element={!token ? <PublicRecipeCalculatorView /> : <Navigate to="/" replace />}
                    />
                    <Route
                        path="/login"
                        element={!token ? <LoginPage /> : <Navigate to="/" replace />}
                    />
                    <Route
                        path="/register"
                        element={!token ? <RegisterPage /> : <Navigate to="/" replace />}
                    />
                    <Route
                        path="/bake/:bakeLogId"
                        element={token ? <GuidedBakePage /> : <Navigate to="/login" replace />}
                    />
                      
                    {/* Authenticated Routes */}
                    <Route
                        path="/"
                        element={token ? <RecipeCalculator /> : <Navigate to="/public-calculator" replace />}
                    />

                    {/* Fallback for any other route */}
                    <Route path="*" element={<Navigate to={token ? "/" : "/public-calculator"} replace />} />
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
                    <ToastProvider> {/* Wrap with ToastProvider */}
                        <div className="App">
                            <h1 className="app-title">Sourdough Recipe Calculator</h1>
                            <AppContent />
                            <ToastContainer /> {/* Render ToastContainer here, inside App div but outside AppContent */}
                        </div>
                    </ToastProvider>
                </DataProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;