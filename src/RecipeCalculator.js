// src/RecipeCalculator.js
import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { useNavigate } from 'react-router-dom';
import RecipeService from './services/RecipeService';
import RecipeFields from './components/RecipeFields';
import RecipeManagementActions from './components/RecipeManagementActions';
import RecipeResults from './components/RecipeResults';
import StepsColumn from './components/StepsColumn';
import BaseTemplates from './components/BaseTemplates'; // Import the new component

import styles from './components/RecipeCalculator.module.css';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';

// Import from new files
import {
    LEVAIN_BUILD_STEP_NAME,
    INITIAL_RECIPE_FIELDS,
    DEFAULT_LEVAIN_STEP_TEMPLATE
} from './constants/recipeConstants'; // Assuming constants are in src/constants

import {
    calculateRecipe,
    processRecipeSteps,
    getStepDnDId
} from './utils/recipeUtils'; // Assuming utils are in src/utils

const initialState = {
    ...INITIAL_RECIPE_FIELDS,
    currentRecipeId: null,
    isLoadingRecipes: false,
    isSaving: false,
    feedbackMessage: { type: '', text: '' },
    savedRecipes: [],
    selectedRecipeToLoad: '',
    baseRecipeTemplates: [],
    isLoadingBaseTemplates: false,
    isInTemplateMode: false,
    activeTemplateId: null,
};

function recipeReducer(state, action) {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.payload };
        case 'SET_RECIPE_FIELD':
            return { ...state, [action.field]: action.payload, feedbackMessage: { type: '', text: '' } };
        case 'SET_FULL_RECIPE_FORM': {
            const { predefinedSteps, recipeData } = action.payload;
            const processedSteps = processRecipeSteps(recipeData.steps || [], predefinedSteps);
            return {
                ...state,
                recipe_name: recipeData.recipe_name,
                description: recipeData.description,
                targetDoughWeight: String(recipeData.targetDoughWeight),
                hydrationPercentage: String(recipeData.hydrationPercentage),
                saltPercentage: String(parseFloat(recipeData.saltPercentage).toFixed(1)),
                steps: processedSteps,
                currentRecipeId: recipeData.recipe_id || null,
                selectedRecipeToLoad: String(recipeData.recipe_id || ''),
                isInTemplateMode: false,
                activeTemplateId: null,
                feedbackMessage: { type: '', text: '' },
            };
        }
        case 'SET_STEPS':
            return { ...state, steps: action.payload };
        case 'UPDATE_STEP': {
            const { predefinedSteps, levainStepIdDynamic, bulkFermentStepIdDynamic } = action.additionalContext;
            const newSteps = state.steps.map((step, i) => {
                if (i === action.index) {
                    const updatedStep = { ...step, ...action.payload };
                    if (action.payload.step_id !== undefined) {
                        const predefined = predefinedSteps.find(ps => ps.step_id === Number(action.payload.step_id));
                        updatedStep.step_name = predefined ? predefined.step_name : 'Custom Step';
                        updatedStep.contribution_pct = null;
                        updatedStep.target_hydration = null;
                        updatedStep.stretch_fold_interval_minutes = null;
                        updatedStep.duration_override = predefined?.defaultDurationMinutes ?? null;

                        if (Number(action.payload.step_id) === levainStepIdDynamic) {
                             const levainDefault = predefinedSteps.find(ps => ps.step_id === levainStepIdDynamic && ps.step_name === LEVAIN_BUILD_STEP_NAME) || DEFAULT_LEVAIN_STEP_TEMPLATE;
                            updatedStep.contribution_pct = levainDefault.contribution_pct;
                            updatedStep.target_hydration = levainDefault.target_hydration;
                            updatedStep.duration_override = levainDefault.duration_override ?? predefined?.defaultDurationMinutes;
                        } else if (Number(action.payload.step_id) === bulkFermentStepIdDynamic) {
                            updatedStep.stretch_fold_interval_minutes = 30;
                        }
                    }
                    return updatedStep;
                }
                return step;
            });
            return { ...state, steps: newSteps };
        }
        case 'ADD_STEP': {
            const { predefinedSteps, levainStepIdDynamic, bulkFermentStepIdDynamic } = action.payload;
            const maxOrder = state.steps.reduce((max, step) => Math.max(max, step.step_order || 0), 0);
            let defaultNewStepData = {
                step_id: null, step_name: 'New Step', duration_override: null, notes: '',
                target_temperature_celsius: null, contribution_pct: null, target_hydration: null,
                stretch_fold_interval_minutes: null,
            };

            if (predefinedSteps && predefinedSteps.length > 0) {
                const firstPredefined = predefinedSteps[0];
                defaultNewStepData = {
                    ...defaultNewStepData,
                    step_id: firstPredefined.step_id,
                    step_name: firstPredefined.step_name,
                    duration_override: firstPredefined.defaultDurationMinutes ?? null,
                };
                 if (firstPredefined.step_id === levainStepIdDynamic) {
                    const levainDefault = predefinedSteps.find(ps => ps.step_id === levainStepIdDynamic && ps.step_name === LEVAIN_BUILD_STEP_NAME) || DEFAULT_LEVAIN_STEP_TEMPLATE;
                    defaultNewStepData.contribution_pct = levainDefault.contribution_pct;
                    defaultNewStepData.target_hydration = levainDefault.target_hydration;
                    defaultNewStepData.duration_override = levainDefault.duration_override ?? firstPredefined.defaultDurationMinutes;
                } else if (firstPredefined.step_id === bulkFermentStepIdDynamic) {
                    defaultNewStepData.stretch_fold_interval_minutes = 30;
                }
            }
            return {
                ...state,
                steps: [ ...state.steps, { ...defaultNewStepData, temp_client_id: Date.now() + Math.random(), step_order: maxOrder + 1, } ],
            };
        }
        case 'DELETE_STEP':
            return {
                ...state,
                steps: state.steps.filter((_, i) => i !== action.index).map((step, i) => ({ ...step, step_order: i + 1 })),
            };
        case 'REORDER_STEPS':
            return { ...state, steps: action.payload.map((step, i) => ({ ...step, step_order: i + 1 })) };
        case 'SET_LOADING':
            return { ...state, [action.field]: action.payload };
        case 'SET_FEEDBACK':
            return { ...state, feedbackMessage: action.payload };
        case 'CLEAR_FEEDBACK':
            return { ...state, feedbackMessage: { type: '', text: '' } };
        case 'SET_BASE_RECIPE_TEMPLATES':
            return { ...state, baseRecipeTemplates: action.payload, isLoadingBaseTemplates: false };
        case 'SET_LOADING_BASE_TEMPLATES':
            return { ...state, isLoadingBaseTemplates: action.payload };
        case 'LOAD_TEMPLATE_DATA': {
    const templateData = action.payload.template;
    const { predefinedSteps } = action.additionalData;

    // Directly process template steps to ensure new temp_client_ids are generated
    const finalProcessedSteps = (templateData.steps || []).map((rawStep, index) => {
        const predefined = predefinedSteps.find(ps => ps.step_id === rawStep.step_id);
        // Basic properties from processRecipeSteps
        const step = {
            ...rawStep,
            step_name: rawStep.step_name || (predefined ? predefined.step_name : `Unknown Step ID ${rawStep.step_id}`),
            duration_override: rawStep.duration_override != null ? Number(rawStep.duration_override) : null,
            target_temperature_celsius: rawStep.target_temperature_celsius != null ? Number(rawStep.target_temperature_celsius) : null,
            contribution_pct: rawStep.contribution_pct != null ? Number(rawStep.contribution_pct) : null,
            target_hydration: rawStep.target_hydration != null ? Number(rawStep.target_hydration) : null,
            stretch_fold_interval_minutes: rawStep.stretch_fold_interval_minutes != null ? Number(rawStep.stretch_fold_interval_minutes) : null,
            notes: rawStep.notes || (predefined ? predefined.description : '') || '', // Use predefined description as fallback for notes
            
            // --- Critical change here ---
            recipe_step_id: undefined, // Mark as not having a DB ID for this new instance
            temp_client_id: Date.now() + index + Math.random() + '_template_step', // Ensure a NEW unique client ID
        };
        
        // If it's a levain step, apply defaults if specific values aren't on the template step
        // This mirrors logic that might be in your UPDATE_STEP or ADD_STEP for levain
        const levainStepIdDynamic = action.additionalData.levainStepIdDynamic; // Assuming you pass this in additionalData
        if (Number(step.step_id) === levainStepIdDynamic) {
            const levainDefaultFromPredefined = predefinedSteps.find(ps => ps.step_id === levainStepIdDynamic);
            const levainDefault = levainDefaultFromPredefined || DEFAULT_LEVAIN_STEP_TEMPLATE; // Fallback to constant

            step.contribution_pct = step.contribution_pct ?? levainDefault.contribution_pct;
            step.target_hydration = step.target_hydration ?? levainDefault.target_hydration;
            // Duration might also come from predefined if not on step
            if (step.duration_override == null && levainDefault.duration_override != null) {
                step.duration_override = levainDefault.duration_override;
            } else if (step.duration_override == null && predefined?.defaultDurationMinutes != null) {
                 step.duration_override = predefined.defaultDurationMinutes;
            }
        }
        // Add similar default logic for bulk ferment S&F if needed from template
        const bulkFermentStepIdDynamic = action.additionalData.bulkFermentStepIdDynamic;
         if (Number(step.step_id) === bulkFermentStepIdDynamic && step.stretch_fold_interval_minutes == null) {
            step.stretch_fold_interval_minutes = 30; // Default if not specified on template step
        }

        return step;
    });

    return {
        ...state,
        recipe_name: templateData.recipe_name ? `${templateData.recipe_name} (Copy)` : 'New Recipe from Template',
        description: templateData.description || '',
        targetDoughWeight: String(templateData.targetDoughWeight || INITIAL_RECIPE_FIELDS.targetDoughWeight),
        hydrationPercentage: String(templateData.hydrationPercentage || INITIAL_RECIPE_FIELDS.hydrationPercentage),
        saltPercentage: String(parseFloat(templateData.saltPercentage || INITIAL_RECIPE_FIELDS.saltPercentage).toFixed(1)),
        steps: finalProcessedSteps,
        currentRecipeId: null,
        selectedRecipeToLoad: '',
        isInTemplateMode: true,
        activeTemplateId: templateData.recipe_id, // Use the template's original recipe_id for activeTemplateId
        feedbackMessage: { type: '', text: `` },
    };
}
        case 'CLEAR_FORM': {
            const { predefinedSteps, levainStepIdDynamic } = action.payload;
            const initialSteps = [];
            if (predefinedSteps && predefinedSteps.length > 0 && levainStepIdDynamic) {
                const levainTemplate = predefinedSteps.find(ps => ps.step_id === levainStepIdDynamic && ps.step_name === LEVAIN_BUILD_STEP_NAME);
                if (levainTemplate) {
                     initialSteps.push({
                        ...DEFAULT_LEVAIN_STEP_TEMPLATE,
                        step_id: levainTemplate.step_id,
                        step_name: levainTemplate.step_name,
                        duration_override: levainTemplate.defaultDurationMinutes ?? DEFAULT_LEVAIN_STEP_TEMPLATE.duration_override,
                        temp_client_id: Date.now(),
                        step_order: 1,
                     });
                }
            }
            return {
                ...state,
                ...INITIAL_RECIPE_FIELDS,
                saltPercentage: parseFloat(INITIAL_RECIPE_FIELDS.saltPercentage).toFixed(1),
                steps: initialSteps,
                currentRecipeId: null,
                selectedRecipeToLoad: '',
                isInTemplateMode: false,
                activeTemplateId: null,
                feedbackMessage: { type: '', text: '' },
            };
        }
        default:
            return state;
    }
}

function RecipeCalculator() {
    const [state, dispatch] = useReducer(recipeReducer, initialState);
    const { isLoadingBaseTemplates, activeTemplateId } = state;
    const [calculationResults, setCalculationResults] = useState({
        flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0
    });

    const navigate = useNavigate();
    const [isStartingBake, setIsStartingBake] = useState(false);
    const [startBakeError, setStartBakeError] = useState('');
    const { isLoggedIn } = useAuth();
    const {
        predefinedSteps,
        levainStepIdDynamic,
        bulkFermentStepIdDynamic,
        isLoadingPredefinedSteps,
        predefinedStepsError
    } = useData();

    const clearFeedback = useCallback(() => dispatch({ type: 'CLEAR_FEEDBACK' }), []);

    const recipeInputFields = {
        targetDoughWeight: state.targetDoughWeight,
        hydrationPercentage: state.hydrationPercentage,
        saltPercentage: state.saltPercentage,
    };

    const handleRecipeFieldChange = (field, value) => {
        dispatch({ type: 'SET_RECIPE_FIELD', field, payload: value });
    };

    const processLoadedRecipeData = useCallback((recipeDataForProcessing) => {
        const currentPredefinedSteps = predefinedSteps || [];
        const processedStepsData = processRecipeSteps(recipeDataForProcessing.steps || [], currentPredefinedSteps);
        return { ...recipeDataForProcessing, steps: processedStepsData, saltPercentage: parseFloat(recipeDataForProcessing.saltPercentage).toFixed(1) };
    }, [predefinedSteps]);

    const handleClearForm = useCallback(() => {
        dispatch({ type: 'CLEAR_FORM', payload: { predefinedSteps, levainStepIdDynamic } });
    }, [predefinedSteps, levainStepIdDynamic]);


    const fetchUserRecipesList = useCallback(async () => {
        if (!isLoggedIn()) return;
        dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: true });
        clearFeedback();
        try {
            const data = await RecipeService.getUserRecipes();
            const recipes = data || [];
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: recipes });
        } catch (error) {
            console.error("RecipeCalculator: Error fetching user recipes:", error);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Failed to load recipes: ${error.message}` } });
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: [] });
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: false });
        }
    }, [isLoggedIn, clearFeedback]);

    useEffect(() => {
        if (isLoggedIn()) {
            fetchUserRecipesList();
        } else {
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: [] });
            if (predefinedSteps && predefinedSteps.length > 0 && levainStepIdDynamic) {
                 handleClearForm();
            }
        }
    }, [isLoggedIn, fetchUserRecipesList, handleClearForm, predefinedSteps, levainStepIdDynamic]);


    useEffect(() => {
        if (
            isLoggedIn() &&
            predefinedSteps && predefinedSteps.length > 0 &&
            levainStepIdDynamic &&
            !state.currentRecipeId &&
            state.steps.length === 0 &&
            !state.isInTemplateMode
        ) {
            handleClearForm();
        }
    }, [isLoggedIn, predefinedSteps, levainStepIdDynamic, state.currentRecipeId, state.steps.length, state.isInTemplateMode, handleClearForm]);


    useEffect(() => {
        const newResults = calculateRecipe(
            state.targetDoughWeight,
            state.hydrationPercentage,
            state.saltPercentage,
            state.steps,
            levainStepIdDynamic
        );
        setCalculationResults(newResults);
    }, [state.targetDoughWeight, state.hydrationPercentage, state.saltPercentage, state.steps, levainStepIdDynamic]);

    useEffect(() => {
        const fetchBaseTemplates = async () => {
            if (!isLoggedIn()) return;
            dispatch({ type: 'SET_LOADING_BASE_TEMPLATES', payload: true });
            dispatch({ type: 'SET_FEEDBACK', payload: { type: '', text: '' } });
            try {
                const templates = await RecipeService.getBaseRecipeTemplates();
                dispatch({ type: 'SET_BASE_RECIPE_TEMPLATES', payload: templates || [] });
            } catch (error) {
                console.error("RecipeCalculator: Error fetching base recipe templates:", error);
                dispatch({
                    type: 'SET_FEEDBACK',
                    payload: { type: 'error', text: `Failed to load base templates: ${error.message}` }
                });
                 dispatch({ type: 'SET_BASE_RECIPE_TEMPLATES', payload: [] });
            } finally {
                 dispatch({ type: 'SET_LOADING_BASE_TEMPLATES', payload: false });
            }
        };
        if(isLoggedIn()) {
            fetchBaseTemplates();
        } else {
            dispatch({ type: 'SET_BASE_RECIPE_TEMPLATES', payload: [] });
        }
    }, [isLoggedIn]);

    const handleLoadRecipeChange = async (event) => {
        clearFeedback();
        const recipeIdToLoad = event.target.value;
        dispatch({ type: 'SET_FIELD', field: 'selectedRecipeToLoad', payload: recipeIdToLoad });

        if (!recipeIdToLoad) {
            handleClearForm();
            return;
        }
        dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: true });
        try {
            const recipeDataFromApi = await RecipeService.getRecipeById(recipeIdToLoad);
            const processedData = processLoadedRecipeData(recipeDataFromApi);
            dispatch({
                type: 'SET_FULL_RECIPE_FORM',
                payload: { recipeData: processedData, predefinedSteps: predefinedSteps || [] }
            });
        } catch (error) {
            console.error("RecipeCalculator: Error fetching specific recipe:", error);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Failed to load recipe: ${error.message}` } });
            handleClearForm();
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: false });
        }
    };
const handleStartGuidedBake = async () => {
    if (!state.currentRecipeId) {
        setStartBakeError('Please load or save a recipe to start a guided bake.');
        setTimeout(() => setStartBakeError(''), 5000); // Clear error after 5s
        return;
    }
    if (!isLoggedIn()) {
        setStartBakeError('Please login to start a guided bake.');
        setTimeout(() => setStartBakeError(''), 5000); // Clear error after 5s
        return;
    }

    setIsStartingBake(true);
    setStartBakeError('');
    dispatch({ type: 'CLEAR_FEEDBACK' }); // Clear other general feedback

    try {
        // Assuming RecipeService.startBake is implemented as discussed
        const bakeSessionData = await RecipeService.startBake(state.currentRecipeId); 
        if (bakeSessionData && bakeSessionData.bakeLogId) {
            // Pass initial data to GuidedBakePage to potentially avoid an immediate refetch
            navigate(`/bake/${bakeSessionData.bakeLogId}`, { 
                state: { initialBakeData: bakeSessionData } 
            });
        } else {
            // This case might be covered if RecipeService.startBake throws an error for missing bakeLogId
            setStartBakeError('Failed to initiate bake session. Missing session ID from server response.');
            console.error("Start bake response missing bakeLogId:", bakeSessionData);
        }
    } catch (err) {
        console.error("RecipeCalculator: Error starting guided bake:", err);
        setStartBakeError(err.message || 'An unexpected error occurred while starting the bake.');
    } finally {
        setIsStartingBake(false);
    }
};
     const handleLoadTemplateData = useCallback((template) => {
        dispatch({
    type: 'LOAD_TEMPLATE_DATA',
    payload: { template: template },
    additionalData: { 
        predefinedSteps: predefinedSteps || [],
        levainStepIdDynamic,      // Pass this from useData()
        bulkFermentStepIdDynamic  // Pass this from useData()
    }
});
    }, [predefinedSteps]);

    const handleSaveOrUpdateRecipe = async () => {
        clearFeedback();
        const trimmedRecipeName = state.recipe_name.trim();

        if (!trimmedRecipeName) {
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: 'Recipe name is required.' } });
            return;
        }
        if (state.steps.length === 0) {
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: 'At least one recipe step is required.' } });
            return;
        }
        for (const step of state.steps) {
            if (step.step_id == null || step.step_order == null) {
                 dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Each step must have a type and order.`}});
                 return;
            }
            if (step.step_id === levainStepIdDynamic && (step.contribution_pct == null || step.target_hydration == null)) {
                dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Levain Build step requires Contribution % and Starter Hydration %.`}});
                return;
            }
            if (step.step_id === bulkFermentStepIdDynamic) {
                if (step.duration_override == null || step.stretch_fold_interval_minutes == null) {
                    dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Bulk Fermentation with S&F step requires Total Bulk Time and S&F Interval.` }});
                    return;
                }
            }
        }

        const isAttemptingToSaveNew = !state.currentRecipeId || state.isInTemplateMode;

        if (isAttemptingToSaveNew) {
            const recipeNameExists = state.savedRecipes.some(
                (recipe) => recipe.recipe_name === trimmedRecipeName
            );
            if (recipeNameExists) {
                dispatch({
                    type: 'SET_FEEDBACK',
                    payload: { type: 'error', text: `A recipe named "${trimmedRecipeName}" already exists. Please choose a different name.` }
                });
                if (state.isInTemplateMode) {
                    dispatch({ type: 'SET_FIELD', field: 'isInTemplateMode', payload: false });
                    dispatch({ type: 'SET_FIELD', field: 'activeTemplateId', payload: null });
                }
                dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: false });
                return;
            }
        }

        dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: true });

        const recipePayload = {
            recipe_name: trimmedRecipeName,
            description: state.description,
            targetDoughWeight: parseFloat(state.targetDoughWeight),
            hydrationPercentage: parseFloat(state.hydrationPercentage),
            saltPercentage: parseFloat(state.saltPercentage),
            steps: state.steps.map(step => ({
                step_id: step.step_id,
                step_order: step.step_order,
                duration_override: step.duration_override,
                notes: step.notes,
                target_temperature_celsius: step.target_temperature_celsius,
                contribution_pct: step.contribution_pct,
                target_hydration: step.target_hydration,
                stretch_fold_interval_minutes: step.stretch_fold_interval_minutes,
                recipe_step_id: (state.currentRecipeId && !state.isInTemplateMode && step.recipe_step_id) ? step.recipe_step_id : undefined
            })),
        };

        const isUpdatingExistingUserRecipe = state.currentRecipeId && !state.isInTemplateMode;

        try {
            let result;
            if (isUpdatingExistingUserRecipe) {
                result = await RecipeService.updateRecipe(state.currentRecipeId, recipePayload);
                dispatch({ type: 'SET_FEEDBACK', payload: { type: 'success', text: 'Recipe updated successfully!' } });
                const updatedRecipeData = await RecipeService.getRecipeById(state.currentRecipeId);
                const processedData = processLoadedRecipeData(updatedRecipeData);
                dispatch({
                    type: 'SET_FULL_RECIPE_FORM',
                    payload: { recipeData: processedData, predefinedSteps: predefinedSteps || [] }
                });

            } else {
                result = await RecipeService.saveRecipe(recipePayload);
                dispatch({ type: 'SET_FEEDBACK', payload: { type: 'success', text: 'Recipe saved successfully!' } });

                const newRecipeData = result.recipe;
                const processedNewData = processLoadedRecipeData(newRecipeData);

                dispatch({
                    type: 'SET_FULL_RECIPE_FORM',
                    payload: { recipeData: processedNewData, predefinedSteps: predefinedSteps || [] }
                });
            }
            fetchUserRecipesList();
        } catch (error) {
            console.error("RecipeCalculator: Error saving/updating recipe:", error);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Failed to save recipe: ${error.message}` } });
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: false });
        }
    };

    const handleDeleteRecipe = async () => {
        if (!state.currentRecipeId) {
            dispatch({ type: 'SET_FEEDBACK', payload: {type: 'error', text: 'No recipe loaded to delete.'}});
            return;
        }
        clearFeedback();
        dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: true });
        try {
            await RecipeService.deleteRecipe(state.currentRecipeId);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'success', text: 'Recipe deleted successfully!' } });
            handleClearForm();
            fetchUserRecipesList();
        } catch (error) {
            console.error("RecipeCalculator: Error deleting recipe:", error);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Failed to delete recipe: ${error.message}` } });
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: false });
        }
    };

    const handleStepChange = (index, field, value) => {
        dispatch({
            type: 'UPDATE_STEP',
            index,
            payload: { [field]: value },
            additionalContext: { predefinedSteps: predefinedSteps || [], levainStepIdDynamic, bulkFermentStepIdDynamic }
        });
    };

    const handleAddStep = () => {
        dispatch({ type: 'ADD_STEP', payload: { predefinedSteps: predefinedSteps || [], levainStepIdDynamic, bulkFermentStepIdDynamic } });
    };

    const handleDeleteStep = (indexToDelete) => dispatch({ type: 'DELETE_STEP', index: indexToDelete });

    function handleDragEnd(event) {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = state.steps.findIndex(item => getStepDnDId(item) === active.id);
            const newIndex = state.steps.findIndex(item => getStepDnDId(item) === over.id);
            if (oldIndex === -1 || newIndex === -1) return;
            const reorderedSteps = arrayMove(state.steps, oldIndex, newIndex);
            dispatch({ type: 'REORDER_STEPS', payload: reorderedSteps });
        }
    }

    return (
        <>
            {predefinedStepsError && (
                <p className={`${styles.feedbackMessage} ${styles.feedbackMessageError}`}>
                    {predefinedStepsError}
                </p>
            )}
            {state.feedbackMessage.text && (
                <p className={`${styles.feedbackMessage} ${
                    state.feedbackMessage.type === 'error' ? styles.feedbackMessageError :
                    (state.feedbackMessage.type === 'success' ? styles.feedbackMessageSuccess : styles.feedbackMessageInfo)
                }`}>
                    {state.feedbackMessage.text}
                </p>
            )}
            {startBakeError && (
     <p className={`${styles.feedbackMessage} ${styles.feedbackMessageError}`}>
        {startBakeError}
    </p>
)}

            {isLoggedIn() && (predefinedSteps && predefinedSteps.length > 0) && (
                 <BaseTemplates
                    baseRecipeTemplates={state.baseRecipeTemplates}
                    isLoadingBaseTemplates={isLoadingBaseTemplates}
                    activeTemplateId={activeTemplateId}
                    onLoadTemplateData={handleLoadTemplateData}
                    isInTemplateMode={state.isInTemplateMode}
                />
            )}

            <div className={styles.recipeCalculatorLayout}>
                <div className={styles.recipeDetailsColumn}>
                    <div className={styles.inputsSection}>
                        <h3>Inputs</h3>
                        <RecipeFields
                            recipe={recipeInputFields}
                            onFieldChange={handleRecipeFieldChange}
                            isSaving={state.isSaving}
                            clearFeedback={() => {
    clearFeedback(); // Clears general feedback message from reducer
    setStartBakeError(''); // Also clear bake-specific error
}}
                            isInputsSection={true}
                            isInTemplateMode={state.isInTemplateMode}
                        />
                    </div>
                    <RecipeResults results={calculationResults} />
                    <div className={styles.manageRecipesSection}>
                         <RecipeManagementActions
                            recipeName={state.recipe_name}
                            description={state.description}
                            onRecipeNameChange={(value) => handleRecipeFieldChange('recipe_name', value)}
                            onDescriptionChange={(value) => handleRecipeFieldChange('description', value)}
                            savedRecipes={state.savedRecipes}
                            selectedRecipeToLoad={state.selectedRecipeToLoad}
                            onLoadRecipeChange={handleLoadRecipeChange}
                            onSaveOrUpdate={handleSaveOrUpdateRecipe}
                            onDelete={handleDeleteRecipe}
                            onClearForm={handleClearForm}
                            isLoadingRecipes={state.isLoadingRecipes}
                            isSaving={state.isSaving}
                            currentRecipeId={state.currentRecipeId}
                            clearFeedback={() => {
    clearFeedback(); // Clears general feedback message from reducer
    setStartBakeError(''); // Also clear bake-specific error
}}
                            isInTemplateMode={state.isInTemplateMode}
                        />
                        {isLoggedIn() && state.currentRecipeId && !state.isInTemplateMode && (
    <div className={styles.actionsGroup} style={{ marginTop: 'var(--spacing-unit)' }}>
        <button
            onClick={handleStartGuidedBake}
            disabled={isStartingBake || state.isSaving}
            className={`${styles.buttonWithSpinner} ${styles.buttonPrimaryAccented}`} // Ensure .buttonPrimaryAccented is defined in your CSS
            style={{ width: '100%', backgroundColor: 'var(--color-success)', color: 'white' }} // Example prominent styling
        >
            {isStartingBake ? 'Starting Bake...' : 'Start Guided Bake'}
            {isStartingBake && <span className={styles.buttonSpinner}></span>}
        </button>
    </div>
)}
                    </div>
                </div>
                <StepsColumn
                    recipeSteps={state.steps}
                    predefinedSteps={predefinedSteps || []}
                    onStepChange={handleStepChange}
                    onDeleteStep={handleDeleteStep}
                    onAddStep={handleAddStep}
                    onDragEnd={handleDragEnd}
                    isLoadingPredefinedSteps={isLoadingPredefinedSteps}
                    isSaving={state.isSaving}
                    bulkFermentStepId={bulkFermentStepIdDynamic}
                    levainStepId={levainStepIdDynamic}
                    getStepDnDId={getStepDnDId}
                    isInTemplateMode={state.isInTemplateMode}
                />
            </div>
        </>
    );
}

export default RecipeCalculator;