// src/components/LoginPage.js (Updated)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/AuthService'; // Import the service

function LoginPage({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const data = await AuthService.login(email, password); // Use the service
            console.log('Login successful via AuthService:', data);
            
            if (onLoginSuccess) {
                onLoginSuccess(data.user, data.token); // Notify App.js or context
            }
            navigate('/'); // Redirect
        } catch (err) {
            console.error('Login failed via AuthService:', err);
            setError(err.message || 'Failed to login. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                {/* Form inputs remain the same */}
                <div className="input-group">
                    <label htmlFor="login-email">Email:</label>
                    <input type="email" id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
                </div>
                <div className="input-group">
                    <label htmlFor="login-password">Password:</label>
                    <input type="password" id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                </div>
                {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            {/* Link to register page */}
        </div>
    );
}

export default LoginPage;