// src/components/RegisterPage.js (Updated)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/AuthService'; // Import the service

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
            const data = await AuthService.register(email, password); // Use the service
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
        <div className="auth-page">
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                {/* Form inputs remain the same */}
                <div className="input-group">
                    <label htmlFor="register-email">Email:</label>
                    <input type="email" id="register-email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
                </div>
                <div className="input-group">
                    <label htmlFor="register-password">Password:</label>
                    <input type="password" id="register-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="8" disabled={isLoading} />
                </div>
                {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}
                {successMessage && <p className="success-message" style={{color: 'green'}}>{successMessage}</p>}
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Registering...' : 'Register'}
                </button>
            </form>
            {/* Link to login page */}
        </div>
    );
}

export default RegisterPage;