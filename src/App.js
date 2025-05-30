// src/App.js
import React, { useState } from 'react'; // Added useState for dropdown visibility
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, Link } from 'react-router-dom'; // Added Link
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import RecipeCalculator from './RecipeCalculator';
import PublicRecipeCalculatorView from './components/PublicRecipeCalculatorView';
import GuidedBakePage from './components/GuidedBakePage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/common/ToastContainer';
import { ActiveBakesProvider, useActiveBakes } from './contexts/ActiveBakesContext'; // Import new context
import './App.css';

function AppContent() {
    const { token, currentUser, isLoading, logout } = useAuth();
    const { activeBakes, isLoadingActiveBakes } = useActiveBakes(); // Consume active bakes
    const [isBakesDropdownOpen, setIsBakesDropdownOpen] = useState(false);

    if (isLoading) {
        return <div className="loading-app">Loading Application...</div>;
    }

    const hasActiveBakes = activeBakes && activeBakes.length > 0;

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

                    {/* Active Bakes Dropdown */}
                    {token && hasActiveBakes && (
                        <li className="nav-item-active-bakes">
                            <button
                                className="active-bakes-label btn-nav-link" // New class for green label, styled like a nav link
                                onClick={() => setIsBakesDropdownOpen(prev => !prev)}
                                aria-expanded={isBakesDropdownOpen}
                                aria-haspopup="true"
                            >
                                Active Bakes ({activeBakes.length})
                            </button>
                            {isBakesDropdownOpen && (
                                <ul className="active-bakes-dropdown">
                                    {isLoadingActiveBakes ? (
                                        <li>Loading...</li>
                                    ) : (
                                        activeBakes.map(bake => (
                                            <li key={bake.bake_log_id || bake.bakeLogId}>
                                                <Link 
                                                    to={`/bake/${bake.bake_log_id || bake.bakeLogId}`}
                                                    onClick={() => setIsBakesDropdownOpen(false)} // Close dropdown on click
                                                >
                                                    {bake.recipe_name || bake.recipeName || 'Unnamed Recipe'}
                                                    <small> (Status: {bake.status || 'Unknown'})</small>
                                                </Link>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                        </li>
                    )}

                    <li className="nav-item-center">
                        {token && currentUser && (
                            <span>Welcome, {currentUser.username || currentUser.email}!</span>
                        )}
                    </li>

                    <li className="nav-item-right">
                        {!token ? (
                            <>
                                <NavLink to="/login" className={({ isActive }) => isActive ? "active" : ""}>Login</NavLink>
                                <NavLink to="/register" className={({ isActive }) => isActive ? "active" : ""}>Register</NavLink>
                            </>
                        ) : (
                            <button onClick={logout} className="btn btn-nav-logout">Logout</button>
                        )}
                    </li>
                </ul>
            </nav>
            <main>
                <Routes>
                    {/* ... your existing routes ... */}
                    <Route path="/public-calculator" element={!token ? <PublicRecipeCalculatorView /> : <Navigate to="/" replace />} />
                    <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" replace />} />
                    <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to="/" replace />} />
                    <Route path="/bake/:bakeLogId" element={token ? <GuidedBakePage /> : <Navigate to="/login" replace />} />
                    <Route path="/" element={token ? <RecipeCalculator /> : <Navigate to="/public-calculator" replace />} />
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
                    <ToastProvider>
                        <ActiveBakesProvider> {/* Add ActiveBakesProvider here */}
                            <div className="App">
                                <h1 className="app-title">Sourdough Recipe Calculator</h1>
                                <AppContent />
                                <ToastContainer />
                            </div>
                        </ActiveBakesProvider>
                    </ToastProvider>
                </DataProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;