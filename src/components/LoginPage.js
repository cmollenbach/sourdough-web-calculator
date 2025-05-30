// src/components/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AuthForm.css';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext'; // Import useToast

function LoginPage() {
    const { login } = useAuth();
    const { addToast } = useToast(); // Get addToast
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // setError can be removed if all errors are shown via toasts
    // const [error, setError] = useState(''); 
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        // setError(''); // Remove if not used
        try {
            await login(email, password);
            // Successful login will navigate, AuthContext doesn't throw error here for success.
            // A success toast for login can be added in App.js based on currentUser change if desired.
            navigate('/'); 
        } catch (err) {
            // Error from AuthContext's login (which gets it from AuthService.login)
            addToast(err.message || 'Failed to login. Please check your credentials.', "error");
            console.error('Login failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-form-container">
            <div className="auth-form">
                <h2>Login</h2>
                {/* Removed: {error && <p className="feedback-message feedback-message-error">{error}</p>} */}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="form-control"
                            autoComplete="username"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="form-control"
                            autoComplete="current-password"
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary buttonWithSpinner"
                        style={{ width: '100%'}}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                        {isLoading && <span className="buttonSpinner"></span>}
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