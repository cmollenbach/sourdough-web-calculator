// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom'; // Changed Link to NavLink
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import RecipeCalculator from './RecipeCalculator';
import AuthService from './services/AuthService';
import './App.css';

function App() {
    const [token, setToken] = useState(AuthService.getToken());
    const [currentUser, setCurrentUser] = useState(AuthService.getUser());

    useEffect(() => {
        const currentToken = AuthService.getToken();
        const user = AuthService.getUser();
        if (currentToken && user) {
            setToken(currentToken);
            setCurrentUser(user);
            console.log("App loaded. User is logged in:", user);
        } else {
            console.log("App loaded. No user logged in.");
        }
    }, []);

    const handleLoginSuccess = (user, receivedToken) => {
        setToken(receivedToken);
        setCurrentUser(user);
        console.log("Login successful in App.js, user set:", user);
    };

    const handleLogout = () => {
        AuthService.logout();
        setToken(null);
        setCurrentUser(null);
        console.log("User logged out from App.js");
    };

    // Function to determine if a NavLink should be active
    // For the main calculator page, we only want it active if it's exactly that path.
    const navLinkIsActive = (path, match, location) => {
        if (!match) {
            return false;
        }
        if (path === "/") {
            return location.pathname === "/";
        }
        return true;
    };


    return (
        <Router>
            <div className="App">
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
                                <li><button onClick={handleLogout}>Logout</button></li>
                            </>
                        )}
                    </ul>
                </nav>

                <main>
                    <Routes>
                        <Route path="/login" element={!token ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} />
                        <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to="/" />} />
                        
                        <Route 
                            path="/" 
                            element={
                                token ? <RecipeCalculator /> : <Navigate to="/login" replace />
                            } 
                        />
                        
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;