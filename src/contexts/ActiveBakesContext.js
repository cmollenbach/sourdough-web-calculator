// src/contexts/ActiveBakesContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import RecipeService from '../services/RecipeService';
import { useAuth } from './AuthContext';
// Removed: import { useToast } from './ToastContext'; // Not used directly in this version of fetchActiveBakes

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
    const [activeBakesError, setActiveBakesError] = useState('');
    const { isLoggedIn, token } = useAuth();
    // const { addToast } = useToast(); // addToast not directly used in fetchActiveBakes in this version

    const fetchActiveBakes = useCallback(async () => {
        if (!isLoggedIn()) {
            setActiveBakes([]);
            setIsLoadingActiveBakes(false);
            return;
        }

        setIsLoadingActiveBakes(true);
        setActiveBakesError('');
        try {
            const data = await RecipeService.getActiveBakes();
            setActiveBakes(data.activeBakes || data || []);
        } catch (error) {
            console.error("ActiveBakesContext: Error fetching active bakes:", error);
            const errorMsg = error.message || "Failed to load active bakes.";
            setActiveBakesError(errorMsg);
            // If you want to show a toast here, you'd uncomment the addToast import
            // and the line below, then addToast would be a necessary dependency.
            // addToast(errorMsg, "error");
            setActiveBakes([]);
        } finally {
            setIsLoadingActiveBakes(false);
        }
    }, [isLoggedIn]); // Removed addToast from here as it's not used in this function block

    useEffect(() => {
        fetchActiveBakes();
    }, [token, fetchActiveBakes]);

    const refreshActiveBakes = useCallback(() => {
        fetchActiveBakes();
    }, [fetchActiveBakes]);


    const value = {
        activeBakes,
        isLoadingActiveBakes,
        activeBakesError,
        refreshActiveBakes
    };

    return (
        <ActiveBakesContext.Provider value={value}>
            {children}
        </ActiveBakesContext.Provider>
    );
};