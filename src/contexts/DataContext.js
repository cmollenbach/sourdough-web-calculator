// src/contexts/DataContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import RecipeService, { AuthError } from '../services/RecipeService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { LEVAIN_BUILD_STEP_NAME } from '../constants/recipeConstants';

const BULK_FERMENT_S_AND_F_STEP_NAME = 'Bulk Fermentation with Stretch and Fold';
const MIX_FINAL_DOUGH_STEP_NAME = 'Mix Final Dough';
const POOLISH_BUILD_STEP_NAME = 'Poolish Build';
const BIGA_BUILD_STEP_NAME = 'Biga Build';
// Add other key step names as needed, e.g., 'Soaker Prep', 'Scald Prep'
const SOAKER_PREP_STEP_NAME = 'Soaker Prep';
const SCALD_PREP_STEP_NAME = 'Scald Prep';


const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
    const { isLoggedIn, isLoading: authIsLoading, logout } = useAuth();
    const { addToast } = useToast();

    const [predefinedSteps, setPredefinedSteps] = useState([]);
    const [isLoadingPredefinedSteps, setIsLoadingPredefinedSteps] = useState(false);

    const [levainStepIdDynamic, setLevainStepIdDynamic] = useState(null);
    const [bulkFermentStepIdDynamic, setBulkFermentStepIdDynamic] = useState(null);
    const [mixFinalDoughStepId, setMixFinalDoughStepId] = useState(null);
    const [poolishBuildStepId, setPoolishBuildStepId] = useState(null);
    const [bigaBuildStepId, setBigaBuildStepId] = useState(null);
    const [soakerPrepStepId, setSoakerPrepStepId] = useState(null);
    const [scaldPrepStepId, setScaldPrepStepId] = useState(null);


    const [availableIngredients, setAvailableIngredients] = useState([]);
    const [isLoadingAvailableIngredients, setIsLoadingAvailableIngredients] = useState(false);

    const fetchAndSetData = useCallback(async () => {
        if (authIsLoading) {
            return;
        }

        const loggedIn = isLoggedIn();

        if (!loggedIn) {
            setPredefinedSteps([]);
            setLevainStepIdDynamic(null);
            setBulkFermentStepIdDynamic(null);
            setMixFinalDoughStepId(null);
            setPoolishBuildStepId(null);
            setBigaBuildStepId(null);
            setSoakerPrepStepId(null);
            setScaldPrepStepId(null);
            setIsLoadingPredefinedSteps(false);

            setAvailableIngredients([]);
            setIsLoadingAvailableIngredients(false);
            return;
        }

        // Fetch Predefined Steps
        setIsLoadingPredefinedSteps(true);
        try {
            const stepsData = await RecipeService.getPredefinedSteps();
            const steps = stepsData || [];
            setPredefinedSteps(steps);

            const findStepId = (name) => {
                const step = steps.find(s => s.step_name === name);
                return step ? step.step_id : null;
            };

            setLevainStepIdDynamic(findStepId(LEVAIN_BUILD_STEP_NAME));
            setBulkFermentStepIdDynamic(findStepId(BULK_FERMENT_S_AND_F_STEP_NAME));
            setMixFinalDoughStepId(findStepId(MIX_FINAL_DOUGH_STEP_NAME));
            setPoolishBuildStepId(findStepId(POOLISH_BUILD_STEP_NAME));
            setBigaBuildStepId(findStepId(BIGA_BUILD_STEP_NAME));
            setSoakerPrepStepId(findStepId(SOAKER_PREP_STEP_NAME));
            setScaldPrepStepId(findStepId(SCALD_PREP_STEP_NAME));

        } catch (error) {
            console.error("DataContext: Error fetching predefined steps:", error);
            if (error instanceof AuthError) {
                addToast(error.message || "Session expired fetching steps. Please log in again.", "error");
                logout();
            } else {
                addToast(`Failed to load step types: ${error.message}`, "error");
            }
            setPredefinedSteps([]);
            // Reset all derived step IDs
            setLevainStepIdDynamic(null);
            setBulkFermentStepIdDynamic(null);
            setMixFinalDoughStepId(null);
            setPoolishBuildStepId(null);
            setBigaBuildStepId(null);
            setSoakerPrepStepId(null);
            setScaldPrepStepId(null);
        } finally {
            setIsLoadingPredefinedSteps(false);
        }

        // Fetch Available Ingredients
        setIsLoadingAvailableIngredients(true);
        try {
            // Ensure /api/ingredients endpoint exists and works as expected
            const ingredientsData = await RecipeService.getAvailableIngredients();
            setAvailableIngredients(ingredientsData || []);
        } catch (error) {
            console.error("DataContext: Error fetching available ingredients:", error);
             if (error instanceof AuthError) {
                addToast(error.message || "Session expired fetching ingredients. Please log in again.", "error");
                logout();
            } else {
                addToast(`Failed to load ingredients: ${error.message}`, "error");
            }
            setAvailableIngredients([]);
        } finally {
            setIsLoadingAvailableIngredients(false);
        }

    }, [isLoggedIn, authIsLoading, addToast, logout]);

    useEffect(() => {
        fetchAndSetData();
    }, [fetchAndSetData]);

    const contextValue = {
        predefinedSteps,
        isLoadingPredefinedSteps,

        levainStepIdDynamic,
        bulkFermentStepIdDynamic,
        mixFinalDoughStepId,
        poolishBuildStepId,
        bigaBuildStepId,
        soakerPrepStepId,
        scaldPrepStepId,

        availableIngredients,
        isLoadingAvailableIngredients,
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
            isLoadingPredefinedSteps: true, // Default to true if context not ready

            levainStepIdDynamic: null,
            bulkFermentStepIdDynamic: null,
            mixFinalDoughStepId: null,
            poolishBuildStepId: null,
            bigaBuildStepId: null,
            soakerPrepStepId: null,
            scaldPrepStepId: null,

            availableIngredients: [],
            isLoadingAvailableIngredients: true, // Default to true
        };
    }
    return context;
};