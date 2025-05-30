// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, Link } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import RecipeCalculator from './RecipeCalculator';
import PublicRecipeCalculatorView from './components/PublicRecipeCalculatorView';
import GuidedBakePage from './components/GuidedBakePage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/common/ToastContainer';
import { ActiveBakesProvider, useActiveBakes } from './contexts/ActiveBakesContext';
import './App.css';

function AppContent() {
    const { token, currentUser, isLoading, logout } = useAuth();
    const { activeBakes, isLoadingActiveBakes } = useActiveBakes();
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

                    {token && hasActiveBakes && (
                        <li className="nav-item-active-bakes">
                            <button
                                className="active-bakes-label btn-nav-link"
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
                                        activeBakes.map(bake => {
                                            // ** USE THE CORRECT FIELD: bake.bake_start_timestamp **
                                            const startTimeISO = bake.bake_start_timestamp; 
                                            let formattedStartTime = 'Unknown start time';

                                            if (startTimeISO) {
                                                try {
                                                    const dateObj = new Date(startTimeISO);
                                                    if (!isNaN(dateObj.getTime())) {
                                                        formattedStartTime = dateObj.toLocaleString([], {
                                                            year: 'numeric', month: 'numeric', day: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        });
                                                    } else {
                                                        console.warn(`Invalid date format for bake ${bake.bakeLogId}. Timestamp was:`, startTimeISO);
                                                    }
                                                } catch (e) {
                                                    console.error("Error formatting bake start time for bake " + bake.bakeLogId + ":", e, "Timestamp was:", startTimeISO);
                                                }
                                            } else {
                                                console.warn(`bake_start_timestamp field missing for bake ${bake.bakeLogId}. Bake object:`, JSON.stringify(bake));
                                            }
                                            
                                            return (
                                                <li key={bake.bakeLogId}> {/* Use bakeLogId from mapped object */}
                                                    <Link 
                                                        to={`/bake/${bake.bakeLogId}`}
                                                        onClick={() => setIsBakesDropdownOpen(false)}
                                                    >
                                                        {bake.recipeName || 'Unnamed Recipe'} {/* Use recipeName from mapped object */}
                                                        <small> (Status: {bake.status || 'Unknown'})</small>
                                                        <small className="bake-start-time-dropdown"> 
                                                            Started: {formattedStartTime}
                                                        </small>
                                                    </Link>
                                                </li>
                                            );
                                        })
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
                <ToastProvider>
                    <DataProvider>
                        <ActiveBakesProvider>
                            <div className="App">
                                <h1 className="app-title">Sourdough Recipe Calculator</h1>
                                <AppContent />
                                <ToastContainer />
                            </div>
                        </ActiveBakesProvider>
                    </DataProvider>
                </ToastProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;