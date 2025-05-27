// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage'; // Adjust path if needed
import RegisterPage from './components/RegisterPage'; // Adjust path if needed
import RecipeCalculator from './RecipeCalculator'; // Your main app component
import AuthService from './services/AuthService';
import './App.css'; // Or your main CSS file

function App() {
    const [token, setToken] = useState(AuthService.getToken());
    const [currentUser, setCurrentUser] = useState(AuthService.getUser());

    // This effect could be used to verify token with backend if needed on app load
    // For now, we trust localStorage. A robust app might verify the token's validity.
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
        // No need to navigate here, protected route logic will handle redirect
    };

    return (
        <Router>
            <div className="App">
                <nav>
                    <ul>
                        <li><Link to="/">Home (Calculator)</Link></li>
                        {!token ? (
                            <>
                                <li><Link to="/login">Login</Link></li>
                                <li><Link to="/register">Register</Link></li>
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
                        
                        {/* Protected Route for RecipeCalculator */}
                        <Route 
                            path="/" 
                            element={
                                token ? <RecipeCalculator /> : <Navigate to="/login" replace />
                            } 
                        />
                        
                        {/* You can add more routes here */}
                        {/* Example: <Route path="/profile" element={token ? <UserProfilePage /> : <Navigate to="/login" />} /> */}
                        
                        {/* Optional: Catch-all for 404 or redirect to home */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;