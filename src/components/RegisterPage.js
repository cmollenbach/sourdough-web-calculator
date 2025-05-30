// src/components/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthService from '../services/AuthService';
import './AuthForm.css';
import { useToast } from '../contexts/ToastContext'; // Import useToast

function RegisterPage() {
    const { addToast } = useToast(); // Get addToast
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // const [error, setError] = useState(''); // Remove
    // const [successMessage, setSuccessMessage] = useState(''); // Remove
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        // setError(''); // Remove
        // setSuccessMessage(''); // Remove

        try {
            const data = await AuthService.register(email, password);
            addToast(data.message || 'Registration successful! Please login.', "success");
            setTimeout(() => {
                navigate('/login');
            }, 2000); // Keep timeout for user to see toast
        } catch (err) {
            addToast(err.message || 'Failed to register. Please try again.', "error");
            console.error('Registration failed via AuthService:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-form-container">
            <div className="auth-form">
                <h2>Register</h2>
                {/* Removed: {error && <p className="feedback-message feedback-message-error">{error}</p>} */}
                {/* Removed: {successMessage && <p className="feedback-message feedback-message-success">{successMessage}</p>} */}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary buttonWithSpinner"
                        style={{ width: '100%'}}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Registering...' : 'Register'}
                        {isLoading && <span className="buttonSpinner"></span>}
                    </button>
                </form>
                <div className="form-link">
                    Already have an account? <Link to="/login">Login</Link>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;