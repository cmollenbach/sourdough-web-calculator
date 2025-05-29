// src/contexts/DataContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import RecipeService from '../services/RecipeService';
import { useAuth } from './AuthContext'; // To only fetch when logged in

const LEVAIN_BUILD_STEP_NAME = 'Levain Build';
const BULK_FERMENT_S_AND_F_STEP_NAME = 'Bulk Fermentation with Stretch and Fold';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
    const { isLoggedIn, token: authTokenFromContext, isLoading: authIsLoading } = useAuth();
    const [predefinedSteps, setPredefinedSteps] = useState([]);
    const [levainStepIdDynamic, setLevainStepIdDynamic] = useState(null);
    const [bulkFermentStepIdDynamic, setBulkFermentStepIdDynamic] = useState(null);
    const [isLoadingPredefinedSteps, setIsLoadingPredefinedSteps] = useState(false);
    const [predefinedStepsError, setPredefinedStepsError] = useState('');

    const fetchAndSetData = useCallback(async () => {
        if (authIsLoading) {
            console.log('[DataContext] Auth state is still loading. Waiting to fetch predefined steps.');
            // Set loading to true here if you want DataContext to indicate it's waiting for auth
            // setIsLoadingPredefinedSteps(true); 
            return;
        }

        const loggedIn = isLoggedIn(); // Call the function from useAuth
        console.log('[DataContext] fetchAndSetData triggered. isLoggedIn status:', loggedIn);
        console.log('[DataContext] Token from AuthContext at this point:', authTokenFromContext);

        if (!loggedIn) {
            console.log('[DataContext] User not logged in, clearing data and skipping fetch.');
            setPredefinedSteps([]);
            setLevainStepIdDynamic(null);
            setBulkFermentStepIdDynamic(null);
            setPredefinedStepsError('');
            setIsLoadingPredefinedSteps(false);
            return;
        }

        console.log('[DataContext] User is logged in. Attempting to fetch predefined steps...');
        setIsLoadingPredefinedSteps(true);
        setPredefinedStepsError('');
        try {
            // The RecipeService.getPredefinedSteps() method should be including the token in its headers
            const data = await RecipeService.getPredefinedSteps();
            const steps = data || [];
            setPredefinedSteps(steps);
            console.log('[DataContext] Predefined steps fetched:', steps.length);

            const levainStep = steps.find(s => s.step_name === LEVAIN_BUILD_STEP_NAME);
            setLevainStepIdDynamic(levainStep ? levainStep.step_id : null);

            const bulkFermentStep = steps.find(s => s.step_name === BULK_FERMENT_S_AND_F_STEP_NAME);
            setBulkFermentStepIdDynamic(bulkFermentStep ? bulkFermentStep.step_id : null);

        } catch (error) {
            console.error("[DataContext] Error fetching predefined steps:", error.message);
            // The error message from RecipeService (which includes the server's message) should be caught here
            setPredefinedStepsError(`Failed to load step types: ${error.message}`);
            setPredefinedSteps([]);
            setLevainStepIdDynamic(null);
            setBulkFermentStepIdDynamic(null);
        } finally {
            setIsLoadingPredefinedSteps(false);
        }
    }, [isLoggedIn, authTokenFromContext, authIsLoading]); // Dependencies for useCallback

    useEffect(() => {
        fetchAndSetData();
    }, [fetchAndSetData]); // useEffect now depends on the stable fetchAndSetData reference

    // Fallback value in case context is not yet available or an error occurred during provider setup
    const contextValue = {
        predefinedSteps,
        levainStepIdDynamic,
        bulkFermentStepIdDynamic,
        isLoadingPredefinedSteps,
        predefinedStepsError
    };
    
    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === null || context === undefined ) { // Check for null as well
        console.warn('useData: DataContext is not yet available or an error occurred in DataProvider. Returning fallback defaults.');
        // Return a default shape to prevent errors in consuming components
        return {
            predefinedSteps: [],
            levainStepIdDynamic: null,
            bulkFermentStepIdDynamic: null,
            isLoadingPredefinedSteps: true, // Indicate loading as data is not ready
            predefinedStepsError: 'DataContext not available'
        };
    }
    return context;
};