// src/contexts/DataContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import RecipeService, { AuthError } from '../services/RecipeService'; // Import AuthError
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext'; // Import useToast
import { LEVAIN_BUILD_STEP_NAME } from '../constants/recipeConstants';

const BULK_FERMENT_S_AND_F_STEP_NAME = 'Bulk Fermentation with Stretch and Fold';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
    const { isLoggedIn, isLoading: authIsLoading, logout } = useAuth(); // Get logout
    const { addToast } = useToast(); // Get addToast
    const [predefinedSteps, setPredefinedSteps] = useState([]);
    const [levainStepIdDynamic, setLevainStepIdDynamic] = useState(null);
    const [bulkFermentStepIdDynamic, setBulkFermentStepIdDynamic] = useState(null);
    const [isLoadingPredefinedSteps, setIsLoadingPredefinedSteps] = useState(false);
    // const [predefinedStepsError, setPredefinedStepsError] = useState(''); // Remove, use toast

    const fetchAndSetData = useCallback(async () => {
        if (authIsLoading) {
            return;
        }

        const loggedIn = isLoggedIn();

        if (!loggedIn) {
            setPredefinedSteps([]);
            setLevainStepIdDynamic(null);
            setBulkFermentStepIdDynamic(null);
            // setPredefinedStepsError(''); // Remove
            setIsLoadingPredefinedSteps(false);
            return;
        }

        setIsLoadingPredefinedSteps(true);
        // setPredefinedStepsError(''); // Remove
        try {
            // Assuming getPredefinedSteps might become authenticated or needs robust error handling
            const data = await RecipeService.getPredefinedSteps();
            const steps = data || [];
            setPredefinedSteps(steps);

            const levainStep = steps.find(s => s.step_name === LEVAIN_BUILD_STEP_NAME);
            setLevainStepIdDynamic(levainStep ? levainStep.step_id : null);

            const bulkFermentStep = steps.find(s => s.step_name === BULK_FERMENT_S_AND_F_STEP_NAME);
            setBulkFermentStepIdDynamic(bulkFermentStep ? bulkFermentStep.step_id : null);

        } catch (error) {
            console.error("DataContext: Error fetching predefined steps:", error);
            if (error instanceof AuthError) {
                addToast(error.message || "Session expired. Please log in again.", "error");
                logout();
            } else {
                addToast(`Failed to load step types: ${error.message}`, "error");
            }
            // setPredefinedStepsError(`Failed to load step types: ${error.message}`); // Remove
            setPredefinedSteps([]);
            setLevainStepIdDynamic(null);
            setBulkFermentStepIdDynamic(null);
        } finally {
            setIsLoadingPredefinedSteps(false);
        }
    }, [isLoggedIn, authIsLoading, addToast, logout]); // Added addToast, logout

    useEffect(() => {
        fetchAndSetData();
    }, [fetchAndSetData]);

    const contextValue = {
        predefinedSteps,
        levainStepIdDynamic,
        bulkFermentStepIdDynamic,
        isLoadingPredefinedSteps,
        // predefinedStepsError // Remove if not used elsewhere directly
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
        return {
            predefinedSteps: [],
            levainStepIdDynamic: null,
            bulkFermentStepIdDynamic: null,
            isLoadingPredefinedSteps: true,
            // predefinedStepsError: 'DataContext not available' // Remove if error state is removed
        };
    }
    return context;
};