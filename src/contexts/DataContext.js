// src/contexts/DataContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import RecipeService from '../services/RecipeService';
import { useAuth } from './AuthContext';

import { LEVAIN_BUILD_STEP_NAME } from '../constants/recipeConstants';

const BULK_FERMENT_S_AND_F_STEP_NAME = 'Bulk Fermentation with Stretch and Fold';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
    const { isLoggedIn, isLoading: authIsLoading } = useAuth(); // Removed authTokenFromContext as it wasn't directly used in dependencies
    const [predefinedSteps, setPredefinedSteps] = useState([]);
    const [levainStepIdDynamic, setLevainStepIdDynamic] = useState(null);
    const [bulkFermentStepIdDynamic, setBulkFermentStepIdDynamic] = useState(null);
    const [isLoadingPredefinedSteps, setIsLoadingPredefinedSteps] = useState(false);
    const [predefinedStepsError, setPredefinedStepsError] = useState('');

    const fetchAndSetData = useCallback(async () => {
        if (authIsLoading) {
            return;
        }

        const loggedIn = isLoggedIn();

        if (!loggedIn) {
            setPredefinedSteps([]);
            setLevainStepIdDynamic(null);
            setBulkFermentStepIdDynamic(null);
            setPredefinedStepsError('');
            setIsLoadingPredefinedSteps(false);
            return;
        }

        setIsLoadingPredefinedSteps(true);
        setPredefinedStepsError('');
        try {
            const data = await RecipeService.getPredefinedSteps();
            const steps = data || [];
            setPredefinedSteps(steps);

            const levainStep = steps.find(s => s.step_name === LEVAIN_BUILD_STEP_NAME);
            setLevainStepIdDynamic(levainStep ? levainStep.step_id : null);

            const bulkFermentStep = steps.find(s => s.step_name === BULK_FERMENT_S_AND_F_STEP_NAME);
            setBulkFermentStepIdDynamic(bulkFermentStep ? bulkFermentStep.step_id : null);

        } catch (error) {
            // Consider a more user-friendly error or logging to an error service
            setPredefinedStepsError(`Failed to load step types: ${error.message}`);
            setPredefinedSteps([]);
            setLevainStepIdDynamic(null);
            setBulkFermentStepIdDynamic(null);
        } finally {
            setIsLoadingPredefinedSteps(false);
        }
    }, [isLoggedIn, authIsLoading]); // Removed authTokenFromContext

    useEffect(() => {
        fetchAndSetData();
    }, [fetchAndSetData]);

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
    if (context === null || context === undefined ) {
        // This warning is useful during development
        // console.warn('useData: DataContext is not yet available or an error occurred in DataProvider. Returning fallback defaults.');
        return {
            predefinedSteps: [],
            levainStepIdDynamic: null,
            bulkFermentStepIdDynamic: null,
            isLoadingPredefinedSteps: true,
            predefinedStepsError: 'DataContext not available'
        };
    }
    return context;
};