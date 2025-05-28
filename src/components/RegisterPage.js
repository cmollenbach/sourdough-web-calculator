// src/components/RegisterPage.js (Updated for new styling)
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Added Link
import AuthService from '../services/AuthService';
import './AuthForm.css'; // Import the shared CSS file

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
            // Keep existing timeout to navigate to login after success
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
        <div className="auth-form-container"> {/* Use shared container class */}
            <div className="auth-form"> {/* Use shared form card class */}
                <h2>Register</h2>
                {error && <p className="error-message">{error}</p>} {/* Use shared error class */}
                {successMessage && <p className="text-success">{successMessage}</p>} {/* Use shared success class from App.css */}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="register-email">Email:</label>
                        <input 
                            type="email" 
                            id="register-email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            disabled={isLoading}
                            placeholder="Enter your email" 
                        />
                    </div>
                    <div className="input-group">
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
                        />
                    </div>
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Registering...' : 'Register'}
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