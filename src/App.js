// src/App.js
import React, { useState, useEffect } from 'react';
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
import BakeHistoryPage from './components/BakeHistoryPage';
import BakeLogSummaryPage from './components/BakeLogSummaryPage'; // Add this import if not present
import './App.css';

function AppContent() {
    const { token, currentUser, isLoading, logout } = useAuth();
    const { activeBakes, isLoadingActiveBakes } = useActiveBakes();
    const [isBakesDropdownOpen, setIsBakesDropdownOpen] = useState(false);
    const [isTemplateMode, setIsTemplateMode] = useState(token ? true : false);
    const [showTemplates, setShowTemplates] = useState(true);

    // Ensure Template Mode is off when templates are hidden
    useEffect(() => {
        if (!showTemplates && isTemplateMode) {
            setIsTemplateMode(false);
        }
    }, [showTemplates, isTemplateMode]);

    if (isLoading) {
        return <div className="loading-app">Loading Application...</div>;
    }

    const hasActiveBakes = activeBakes && activeBakes.length > 0;

    return (
        <>
            <h1 className="app-title">Sourdough Recipe Calculator</h1>
            {token && currentUser && (
                <div className="welcome-message" style={{ marginBottom: "1em", color: "#666" }}>
                    Welcome, {currentUser.username || currentUser.email}!
                </div>
            )}
            <nav className="main-nav">
                <ul className="main-nav-list">
                    <li className="nav-item-left">
                        <NavLink
                            to={token ? "/" : "/public-calculator"}
                            className={({ isActive }) => isActive ? "active" : ""}
                        >
                            Calculator
                        </NavLink>
                    </li>
                    <li className="nav-item-left">
                        <NavLink
                            to="/bake-history"
                            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
                        >
                            Bake History
                        </NavLink>
                    </li>

                    {token && hasActiveBakes && (
                        <li className="nav-item-active-bakes" style={{ position: "relative" }}>
                            <button
                                className="active-bakes-label btn-nav-link nav-link"
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
                                                    }
                                                } catch (e) { /* ... */ }
                                            }
                                            // Show S&F info if present
                                            const sfSets = bake.currentStepDetails?.number_of_sf_sets;
                                            const sfInterval = bake.currentStepDetails?.stretch_fold_interval_minutes;
                                            return (
                                                <li key={bake.bakeLogId}>
                                                    <Link 
                                                        to={`/bake/${bake.bakeLogId}`}
                                                        onClick={() => setIsBakesDropdownOpen(false)}
                                                    >
                                                        {bake.recipeName || 'Unnamed Recipe'}
                                                        <br />
                                                        <small>
                                                            Step {bake.currentStepDetails?.step_order}: {bake.currentStepDetails?.step_name}
                                                            {sfSets && (
                                                                <> — {sfSets} S&F sets{sfInterval ? ` (every ${sfInterval} min)` : ""}</>
                                                            )}
                                                        </small>
                                                        <br />
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

<li className="nav-item-template-toggle">
  <button
    className="nav-link"
    style={{ background: "none", border: "none", padding: "var(--spacing-sm) var(--spacing-md)", font: "inherit", fontWeight: "var(--font-weight-bold)", cursor: "pointer" }}
    onClick={() => setShowTemplates(v => !v)}
    aria-pressed={showTemplates}
  >
    {showTemplates ? "Hide Templates" : "Show Templates"}
  </button>
</li>

                    <li className="nav-item-right">
                        {!token ? (
                            <>
                                <NavLink
  to="/login"
  className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
>
  Login
</NavLink>
<NavLink
  to="/register"
  className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
>
  Register
</NavLink>
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
                    <Route
  path="/"
  element={
    token ? (
      <RecipeCalculator
        showTemplates={showTemplates}
        forceExitTemplateMode={!showTemplates}
      />
    ) : (
      <Navigate to="/public-calculator" replace />
    )
  }
/>
          <Route path="/bake-history" element={token ? <BakeHistoryPage /> : <Navigate to="/login" replace />} />
          <Route path="/bake-history/:bakeLogId" element={<BakeLogSummaryPage />} />
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