// src/components/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthService from '../services/AuthService';
import './AuthForm.css'; // Keep for .auth-form-container, .auth-form specific layouts

function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const data = await AuthService.register(email, password);
            console.log('Registration successful via AuthService:', data);
            setSuccessMessage(data.message || 'Registration successful! Please login.');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            console.error('Registration failed via AuthService:', err);
            setError(err.message || 'Failed to register. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-form-container"> {/* Uses AuthForm.css for layout */}
            <div className="auth-form"> {/* Uses AuthForm.css for layout */}
                <h2>Register</h2>
                {/* UPDATED to use global feedback message classes */}
                {error && <p className="feedback-message feedback-message-error">{error}</p>}
                {successMessage && <p className="feedback-message feedback-message-success">{successMessage}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group"> {/* Uses AuthForm.css for layout */}
                        <label htmlFor="register-email">Email:</label>
                        <input
                            type="email"
                            id="register-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            placeholder="Enter your email"
                            // Base input styles from App.css
                        />
                    </div>
                    <div className="input-group"> {/* Uses AuthForm.css for layout */}
                        <label htmlFor="register-password">Password:</label>
                        <input
                            type="password"
                            id="register-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength="8"
                            disabled={isLoading}
                            placeholder="Create a password (min. 8 characters)"
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
                        {isLoading ? 'Registering...' : 'Register'}
                        {isLoading && <span className="buttonSpinner"></span>}
                    </button>
                </form>
                <div className="form-link"> {/* Uses AuthForm.css for layout */}
                    Already have an account? <Link to="/login">Login</Link> {/* Link styles from App.css */}
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;