// src/contexts/ActiveBakesContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import RecipeService, { AuthError } from '../services/RecipeService'; // Import AuthError
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext'; // Import useToast

const ActiveBakesContext = createContext(null);

export const useActiveBakes = () => {
    const context = useContext(ActiveBakesContext);
    if (!context) {
        throw new Error('useActiveBakes must be used within an ActiveBakesProvider');
    }
    return context;
};

export const ActiveBakesProvider = ({ children }) => {
    const [activeBakes, setActiveBakes] = useState([]);
    const [isLoadingActiveBakes, setIsLoadingActiveBakes] = useState(false);
    // const [activeBakesError, setActiveBakesError] = useState(''); // Remove, use toast
    const { isLoggedIn, token, logout } = useAuth(); // Get logout
    const { addToast } = useToast(); // Get addToast

    const fetchActiveBakes = useCallback(async () => {
        if (!isLoggedIn()) {
            setActiveBakes([]);
            setIsLoadingActiveBakes(false);
            return;
        }

        setIsLoadingActiveBakes(true);
        // setActiveBakesError(''); // Remove
        try {
            const data = await RecipeService.getActiveBakes();
            setActiveBakes(data.activeBakes || data || []);
        } catch (error) {
            console.error("ActiveBakesContext: Error fetching active bakes:", error);
            const errorMsg = error.message || "Failed to load active bakes.";
            if (error instanceof AuthError) {
                addToast(errorMsg, "error"); // Or a more specific "Session expired..." message
                logout();
            } else {
                addToast(errorMsg, "error");
            }
            // setActiveBakesError(errorMsg); // Remove
            setActiveBakes([]);
        } finally {
            setIsLoadingActiveBakes(false);
        }
    }, [isLoggedIn, addToast, logout]); // Added addToast, logout

    useEffect(() => {
        fetchActiveBakes();
    }, [token, fetchActiveBakes]); // token dependency ensures re-fetch on login/logout

    const refreshActiveBakes = useCallback(() => {
        fetchActiveBakes();
    }, [fetchActiveBakes]);


    const value = {
        activeBakes,
        isLoadingActiveBakes,
        // activeBakesError, // Remove if not used elsewhere
        refreshActiveBakes
    };

    return (
        <ActiveBakesContext.Provider value={value}>
            {children}
        </ActiveBakesContext.Provider>
    );
};