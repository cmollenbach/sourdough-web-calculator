// src/components/LoginPage.js (Updated)
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthService from '../services/AuthService';
import './AuthForm.css'; // Make sure this CSS file is created

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
            const data = await AuthService.login(email, password);
            console.log('Login successful via AuthService:', data);
            
            if (onLoginSuccess) {
                onLoginSuccess(data.user, data.token);
            }
            navigate('/'); // Redirect to home or dashboard
        } catch (err) {
            console.error('Login failed via AuthService:', err);
            setError(err.message || 'Failed to login. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-form-container">
            <div className="auth-form">
                <h2>Login</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="login-email">Email:</label>
                        <input 
                            type="email" 
                            id="login-email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            disabled={isLoading} 
                            placeholder="Enter your email"
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="login-password">Password:</label>
                        <input 
                            type="password" 
                            id="login-password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            disabled={isLoading}
                            placeholder="Enter your password"
                        />
                    </div>
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <div className="form-link">
                    Don't have an account? <Link to="/register">Register</Link>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;