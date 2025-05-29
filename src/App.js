// src/App.js
import React from 'react'; // Removed useState, useEffect
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import RecipeCalculator from './RecipeCalculator';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext'; // Added DataProvider
import './App.css';

function AppContent() {
    const { token, currentUser, isLoading, logout } = useAuth(); // Removed isLoggedIn as token check is sufficient

    if (isLoading) {
        return <div>Loading...</div>; // Or a spinner
    }

    return (
        <>
            <nav>
                <ul>
                    <li>
                        <NavLink
                            to="/"
                            className={({ isActive }) => isActive ? "active" : ""}
                        >
                            Home (Calculator)
                        </NavLink>
                    </li>
                    {!token ? (
                        <>
                            <li>
                                <NavLink
                                    to="/login"
                                    className={({ isActive }) => isActive ? "active" : ""}
                                >
                                    Login
                                </NavLink>
                            </li>
                            <li>
                                <NavLink
                                    to="/register"
                                    className={({ isActive }) => isActive ? "active" : ""}
                                >
                                    Register
                                </NavLink>
                            </li>
                        </>
                    ) : (
                        <>
                            {currentUser && <li><span>Welcome, {currentUser.username || currentUser.email}!</span></li>}
                            <li><button onClick={logout}>Logout</button></li>
                        </>
                    )}
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
                <DataProvider> {/* Wrap AppContent (or relevant part) with DataProvider */}
                    <div className="App">
                        <AppContent />
                    </div>
                </DataProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;