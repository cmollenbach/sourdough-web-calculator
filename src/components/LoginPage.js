// src/components/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AuthForm.css'; // Keep for .auth-form-container, .auth-form specific layouts
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
    const { login } = useAuth();
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
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Failed to login. Please check your credentials.');
            console.error('Login failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-form-container"> {/* Uses AuthForm.css for layout */}
            <div className="auth-form"> {/* Uses AuthForm.css for layout */}
                <h2>Login</h2>
                {/* UPDATED to use global feedback message classes */}
                {error && <p className="feedback-message feedback-message-error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group"> {/* Uses AuthForm.css for layout */}
                        <label htmlFor="login-email">Email:</label>
                        <input
                            type="email"
                            id="login-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            placeholder="Enter your email"
                            // Base input styles from App.css
                        />
                    </div>
                    <div className="input-group"> {/* Uses AuthForm.css for layout */}
                        <label htmlFor="login-password">Password:</label>
                        <input
                            type="password"
                            id="login-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            placeholder="Enter your password"
                            // Base input styles from App.css
                        />
                    </div>
                    {/* UPDATED to use global button classes */}
                    <button
                        type="submit"
                        className="btn btn-primary buttonWithSpinner" /* Apply width via AuthForm.css or inline if needed */
                        style={{ width: '100%'}} /* Or add a .btn-block utility in App.css */
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                        {isLoading && <span className="buttonSpinner"></span>}
                    </button>
                </form>
                <div className="form-link"> {/* Uses AuthForm.css for layout */}
                    Don't have an account? <Link to="/register">Register</Link> {/* Link styles from App.css */}
                </div>
            </div>
        </div>
    );
}

export default LoginPage;