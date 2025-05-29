// src/RecipeCalculator.js
import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

import RecipeService from './services/RecipeService';
import RecipeFields from './components/RecipeFields';
import RecipeManagementActions from './components/RecipeManagementActions';
import RecipeResults from './components/RecipeResults';
import StepsColumn from './components/StepsColumn';

import styles from './components/RecipeCalculator.module.css';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';

// --- Constants ---
const LEVAIN_BUILD_STEP_NAME = 'Levain Build'; // Assuming this is still relevant or managed by DataContext

const INITIAL_RECIPE_FIELDS = {
    recipe_id: null,
    recipe_name: 'My New Sourdough',
    description: '',
    targetDoughWeight: '1000',
    hydrationPercentage: '70',
    saltPercentage: '2.0',
    steps: []
};

const DEFAULT_LEVAIN_STEP_TEMPLATE = { // This might be sourced from predefinedSteps via DataContext now
    step_name: LEVAIN_BUILD_STEP_NAME,
    duration_override: null,
    notes: 'Build the levain for the main dough.',
    target_temperature_celsius: 24,
    contribution_pct: 20,
    target_hydration: 100,
};

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
};

function recipeReducer(state, action) {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.payload };
        case 'SET_RECIPE_FIELD':
            return { ...state, [action.field]: action.payload, feedbackMessage: { type: '', text: '' } };
        case 'SET_FULL_RECIPE_FORM': {
            const { predefinedSteps } = action.payload;
            const processedSteps = (action.payload.recipeData.steps || []).map((step, index) => {
                const predefined = predefinedSteps.find(ps => ps.step_id === step.step_id);
                return {
                    ...step,
                    step_name: step.step_name || (predefined ? predefined.step_name : `Unknown Step ID ${step.step_id}`),
                    duration_override: step.duration_override != null ? Number(step.duration_override) : null,
                    target_temperature_celsius: step.target_temperature_celsius != null ? Number(step.target_temperature_celsius) : null,
                    contribution_pct: step.contribution_pct != null ? Number(step.contribution_pct) : null,
                    target_hydration: step.target_hydration != null ? Number(step.target_hydration) : null,
                    stretch_fold_interval_minutes: step.stretch_fold_interval_minutes != null ? Number(step.stretch_fold_interval_minutes) : null,
                    temp_client_id: step.recipe_step_id ? null : (step.temp_client_id || Date.now() + index + Math.random()),
                };
            });
            return {
                ...state,
                recipe_name: action.payload.recipeData.recipe_name,
                description: action.payload.recipeData.description,
                targetDoughWeight: String(action.payload.recipeData.targetDoughWeight),
                hydrationPercentage: String(action.payload.recipeData.hydrationPercentage),
                saltPercentage: String(parseFloat(action.payload.recipeData.saltPercentage).toFixed(1)),
                steps: processedSteps,
                currentRecipeId: action.payload.recipeData.recipe_id || null,
                selectedRecipeToLoad: String(action.payload.recipeData.recipe_id || ''),
                isInTemplateMode: false, // Loading a user recipe means not in template mode
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

                        // Use DEFAULT_LEVAIN_STEP_TEMPLATE for defaults if it's a levain step
                        if (Number(action.payload.step_id) === levainStepIdDynamic) {
                             const levainDefault = predefinedSteps.find(ps => ps.step_id === levainStepIdDynamic && ps.step_name === LEVAIN_BUILD_STEP_NAME) || DEFAULT_LEVAIN_STEP_TEMPLATE;
                            updatedStep.contribution_pct = levainDefault.contribution_pct;
                            updatedStep.target_hydration = levainDefault.target_hydration;
                            updatedStep.duration_override = levainDefault.duration_override ?? predefined?.defaultDurationMinutes;
                        } else if (Number(action.payload.step_id) === bulkFermentStepIdDynamic) {
                            updatedStep.stretch_fold_interval_minutes = 30; // Or from predefined step defaults
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
                    defaultNewStepData.stretch_fold_interval_minutes = 30; // Default or from predefined
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
            const templateData = action.payload;
            const { predefinedSteps } = action.additionalData; // Ensure predefinedSteps are passed here
            const processedSteps = (templateData.steps || []).map((step, index) => {
                const predefined = predefinedSteps.find(ps => ps.step_id === step.step_id);
                return {
                    ...step,
                    step_name: step.step_name || (predefined ? predefined.step_name : `Unknown Step ID ${step.step_id}`),
                    duration_override: step.duration_override != null ? Number(step.duration_override) : null,
                    target_temperature_celsius: step.target_temperature_celsius != null ? Number(step.target_temperature_celsius) : null,
                    contribution_pct: step.contribution_pct != null ? Number(step.contribution_pct) : null,
                    target_hydration: step.target_hydration != null ? Number(step.target_hydration) : null,
                    stretch_fold_interval_minutes: step.stretch_fold_interval_minutes != null ? Number(step.stretch_fold_interval_minutes) : null,
                    temp_client_id: step.recipe_step_id ? null : (step.temp_client_id || Date.now() + index + Math.random()), // Ensure client ID for new steps from template
                };
            });
            return {
                ...state,
                recipe_name: templateData.recipe_name || 'New Recipe from Template',
                description: templateData.description || '',
                targetDoughWeight: String(templateData.targetDoughWeight || INITIAL_RECIPE_FIELDS.targetDoughWeight),
                hydrationPercentage: String(templateData.hydrationPercentage || INITIAL_RECIPE_FIELDS.hydrationPercentage),
                saltPercentage: String(parseFloat(templateData.saltPercentage || INITIAL_RECIPE_FIELDS.saltPercentage).toFixed(1)),
                steps: processedSteps,
                currentRecipeId: null, // Template is not a saved user recipe yet
                selectedRecipeToLoad: '', // Clear any loaded user recipe selection
                isInTemplateMode: true,
                feedbackMessage: { type: '', text: `` },
            };
        }
        case 'CLEAR_FORM': {
            const { predefinedSteps, levainStepIdDynamic } = action.payload; // predefinedSteps from DataContext
            const initialSteps = [];
            if (predefinedSteps && predefinedSteps.length > 0 && levainStepIdDynamic) {
                const levainTemplate = predefinedSteps.find(ps => ps.step_id === levainStepIdDynamic && ps.step_name === LEVAIN_BUILD_STEP_NAME);
                if (levainTemplate) {
                     initialSteps.push({
                        ...DEFAULT_LEVAIN_STEP_TEMPLATE, // Use base defaults
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
                feedbackMessage: { type: '', text: '' },
            };
        }
        default:
            return state;
    }
}

function calculateRecipe(targetDoughWeight, hydrationPercentage, saltPercentage, steps = [], levainStepId) {
    if (targetDoughWeight <= 0) {
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0 };
    }
    const targetDoughWeightNum = parseFloat(targetDoughWeight);
    const hydrationPercentageNum = parseFloat(hydrationPercentage) / 100.0;
    const saltPercentageNum = parseFloat(saltPercentage) / 100.0;

    const levainStep = steps.find(step =>
        step.step_id === levainStepId &&
        step.contribution_pct != null &&
        step.target_hydration != null
    );

    const starterPercentageNum = levainStep ? parseFloat(levainStep.contribution_pct) / 100.0 : 0;
    const starterHydrationNum = levainStep ? parseFloat(levainStep.target_hydration) / 100.0 : 0;

    if (isNaN(hydrationPercentageNum) || isNaN(saltPercentageNum)) { // Simplified initial NaN check
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0 };
    }
    if (starterPercentageNum > 0 && (isNaN(starterHydrationNum) || (1 + starterHydrationNum) === 0)) {
         return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0 };
    }


    let finalFlourWeight = 0;
    let finalWaterWeight = 0;
    let finalStarterWeight = 0;
    let saltWeightValue = 0;

    if (starterPercentageNum > 0) {
        finalStarterWeight = targetDoughWeightNum * starterPercentageNum;
        const flourInStarter = finalStarterWeight / (1 + starterHydrationNum);
        const waterInStarter = finalStarterWeight - flourInStarter;
        
        // Total flour in recipe (excluding starter flour for this part of calc)
        // (TotalDough - Starter) = Flour_added * (1 + Hydration_overall% + Salt_overall%)
        // Let TF = Total Flour in entire recipe (including starter's flour)
        // TotalDough = TF * (1 + Hydration_overall% + Salt_overall%) -- this is not quite right because salt is % of TF
        // TotalDough = TF + TF*Hydration_overall% + TF*Salt_overall%
        // TotalDough = TF * (1 + Hydration_overall% + Salt_overall%) -- Incorrect if salt is % of total flour
        // If salt is % of TF: TotalDough = TF + (TF*Hydration) + (TF*Salt)
        // TotalDough = TF * (1 + H + S_tf)
        // TF = TotalDough / (1 + H + S_tf)

        // Alternative: Baker's Percentage Style
        // 1 (flour part) + H (water part) + S_s (starter part) + S_tf (salt part based on total flour) = Total parts relative to total flour
        // TotalFlour = targetDoughWeight / (1 + H + S_s/(1+S_h) * (H - S_h) + S_tf ) -- This is getting too complex.
        
        // Simpler: Calculate based on parts, ensuring hydration and salt are correctly applied to total flour.
        // Parts: 1 (flour) + H (water) + St (starter) + Sa (salt)
        // TotalFlour = TargetDough / (1 + H_overall + Salt%_overall + Starter%_overall_of_dough) -- this is if starter % is of dough weight and contains its own flour/water
        
        // Let F_total be total flour in the recipe.
        // W_total = F_total * hydrationPercentageNum
        // Sa_total = F_total * saltPercentageNum
        // St_total = finalStarterWeight (already calculated)
        // F_in_St = flourInStarter
        // W_in_St = waterInStarter
        //
        // F_added = F_total - F_in_St
        // W_added = W_total - W_in_St
        //
        // targetDoughWeightNum = F_added + W_added + St_total + Sa_total
        // targetDoughWeightNum = (F_total - F_in_St) + (F_total * H - W_in_St) + St_total + (F_total * S)
        // targetDoughWeightNum = F_total - F_in_St + F_total*H - W_in_St + (F_in_St + W_in_St) + F_total*S
        // targetDoughWeightNum = F_total * (1 + H + S)
        
        let totalFlourInRecipe = 0;
        if ((1 + hydrationPercentageNum + saltPercentageNum) !== 0) {
             totalFlourInRecipe = targetDoughWeightNum / (1 + hydrationPercentageNum + saltPercentageNum);
        }


        finalFlourWeight = totalFlourInRecipe - flourInStarter;
        const totalWaterInRecipe = totalFlourInRecipe * hydrationPercentageNum;
        finalWaterWeight = totalWaterInRecipe - waterInStarter;
        saltWeightValue = totalFlourInRecipe * saltPercentageNum;

    } else { // No starter contribution
        // targetDoughWeightNum = F_added + W_added + Sa_total
        // targetDoughWeightNum = F_added + F_added*H + F_added*S
        // targetDoughWeightNum = F_added * (1 + H + S)
        if ((1 + hydrationPercentageNum + saltPercentageNum) !== 0) {
            finalFlourWeight = targetDoughWeightNum / (1 + hydrationPercentageNum + saltPercentageNum);
            finalWaterWeight = finalFlourWeight * hydrationPercentageNum;
            saltWeightValue = finalFlourWeight * saltPercentageNum;
        }
    }

    const round = (num) => {
        if (isNaN(num) || !isFinite(num)) return 0;
        return Math.round(num);
    }
     const roundSalt = (num) => {
        if (isNaN(num) || !isFinite(num)) return 0;
        return parseFloat(num.toFixed(1));
    }
    
    const ffw = round(finalFlourWeight);
    const fww = round(finalWaterWeight);
    const fsw = round(finalStarterWeight);
    const swv = roundSalt(saltWeightValue);

    // Adjust total to match targetDoughWeight if difference is small due to rounding, primarily by adjusting water
    let calculatedTotal = ffw + fww + fsw + swv;
    let adjustedWaterWeight = fww;
    if (Math.abs(calculatedTotal - targetDoughWeightNum) > 0.5 && Math.abs(calculatedTotal - targetDoughWeightNum) < 20) { // Check if significant enough to adjust
        adjustedWaterWeight = fww + (targetDoughWeightNum - calculatedTotal);
        adjustedWaterWeight = Math.max(0, round(adjustedWaterWeight)); // Ensure water is not negative
        calculatedTotal = ffw + adjustedWaterWeight + fsw + swv;
    }


    return {
        flourWeight: ffw,
        waterWeight: adjustedWaterWeight,
        starterWeight: fsw,
        saltWeight: swv,
        totalWeight: round(calculatedTotal)
    };
}


const getStepDnDId = (step) => step.recipe_step_id || step.temp_client_id;

function RecipeCalculator() {
    const [state, dispatch] = useReducer(recipeReducer, initialState);
        const { 
        // ... any other state variables you destructure like:
        // recipe_name, description, targetDoughWeight, hydrationPercentage, 
        // saltPercentage, steps, currentRecipeId, isInTemplateMode, 
        // savedRecipes, selectedRecipeToLoad, baseRecipeTemplates,
        // feedbackMessage, isSaving, isLoadingRecipes,
        isLoadingBaseTemplates // <--- ADD THIS
    } = state
    const [calculationResults, setCalculationResults] = useState({
        flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0
    });
    const [activeTemplateId, setActiveTemplateId] = useState(null); // For highlighting selected template card

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
    const recipeManagementFields = {
        recipe_name: state.recipe_name,
        description: state.description,
    };

    const handleRecipeFieldChange = (field, value) => {
        dispatch({ type: 'SET_RECIPE_FIELD', field, payload: value });
    };

    const processLoadedRecipeData = useCallback((recipeDataForProcessing) => {
        const currentPredefinedSteps = predefinedSteps || []; // Ensure predefinedSteps is available
        const processedSteps = (recipeDataForProcessing.steps || []).map((step, index) => {
            const predefined = currentPredefinedSteps.find(ps => ps.step_id === step.step_id);
            return {
                ...step,
                step_name: step.step_name || (predefined ? predefined.step_name : `Unknown Step ID ${step.step_id}`),
                duration_override: step.duration_override != null ? Number(step.duration_override) : null,
                target_temperature_celsius: step.target_temperature_celsius != null ? Number(step.target_temperature_celsius) : null,
                contribution_pct: step.contribution_pct != null ? Number(step.contribution_pct) : null,
                target_hydration: step.target_hydration != null ? Number(step.target_hydration) : null,
                stretch_fold_interval_minutes: step.stretch_fold_interval_minutes != null ? Number(step.stretch_fold_interval_minutes) : null,
                temp_client_id: step.recipe_step_id ? null : (step.temp_client_id || Date.now() + index + Math.random()),
            };
        });
        return { ...recipeDataForProcessing, steps: processedSteps, saltPercentage: parseFloat(recipeDataForProcessing.saltPercentage).toFixed(1) };
    }, [predefinedSteps]);

    const handleClearForm = useCallback(() => {
        dispatch({ type: 'CLEAR_FORM', payload: { predefinedSteps, levainStepIdDynamic } });
        setActiveTemplateId(null); // Clear active template
    }, [predefinedSteps, levainStepIdDynamic, dispatch]);


    const fetchUserRecipesList = useCallback(async () => {
        if (!isLoggedIn()) return;
        dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: true });
        clearFeedback();
        try {
            const data = await RecipeService.getUserRecipes();
            const recipes = data || [];
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: recipes });
            // Removed "No saved recipes found. Create a new one!" message as per user request
        } catch (error) {
            console.error("RecipeCalculator: Error fetching user recipes:", error);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Failed to load recipes: ${error.message}` } });
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: [] });
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: false });
        }
    }, [isLoggedIn, clearFeedback,  dispatch]); // Added dispatch

    useEffect(() => {
        if (isLoggedIn()) {
            fetchUserRecipesList();
        } else {
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: [] });
            if (predefinedSteps && predefinedSteps.length > 0 && levainStepIdDynamic) {
                 handleClearForm(); // This will also clear activeTemplateId
            }
        }
    }, [isLoggedIn, fetchUserRecipesList, handleClearForm, predefinedSteps, levainStepIdDynamic]);


    useEffect(() => {
        if (
            isLoggedIn() &&
            predefinedSteps && predefinedSteps.length > 0 &&
            levainStepIdDynamic &&
            !state.currentRecipeId && // Only if no recipe is loaded
            state.steps.length === 0 && // And no steps currently exist (form is pristine)
            !state.isInTemplateMode // And not already in template mode from another action
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
            if (!isLoggedIn()) return; // Or handle public access differently
            dispatch({ type: 'SET_LOADING_BASE_TEMPLATES', payload: true });
            dispatch({ type: 'SET_FEEDBACK', payload: { type: '', text: '' } }); // Clear previous feedback
            try {
                const templates = await RecipeService.getBaseRecipeTemplates();
                dispatch({ type: 'SET_BASE_RECIPE_TEMPLATES', payload: templates || [] });
            } catch (error) {
                console.error("RecipeCalculator: Error fetching base recipe templates:", error);
                dispatch({
                    type: 'SET_FEEDBACK',
                    payload: { type: 'error', text: `Failed to load base templates: ${error.message}` }
                });
                 dispatch({ type: 'SET_BASE_RECIPE_TEMPLATES', payload: [] }); // Ensure it's an empty array on error
            } finally {
                 dispatch({ type: 'SET_LOADING_BASE_TEMPLATES', payload: false });
            }
        };
        // Only fetch if logged in, or adjust if templates can be public
        if(isLoggedIn()) {
            fetchBaseTemplates();
        } else {
            dispatch({ type: 'SET_BASE_RECIPE_TEMPLATES', payload: [] });
        }
    }, [isLoggedIn, dispatch]); // Added dispatch

    const handleLoadRecipeChange = async (event) => {
        clearFeedback();
        const recipeIdToLoad = event.target.value;
        dispatch({ type: 'SET_FIELD', field: 'selectedRecipeToLoad', payload: recipeIdToLoad });
        setActiveTemplateId(null); // Clear active template highlight

        if (!recipeIdToLoad) {
            handleClearForm();
            return;
        }
        dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: true });
        try {
            const recipeDataFromApi = await RecipeService.getRecipeById(recipeIdToLoad);
            const processedData = processLoadedRecipeData(recipeDataFromApi); // Use the memoized version
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

     const handleLoadTemplateData = useCallback((template) => {
        dispatch({ type: 'LOAD_TEMPLATE_DATA', payload: template, additionalData: { predefinedSteps: predefinedSteps || [] } });
        setActiveTemplateId(template.recipe_id);
    }, [predefinedSteps, dispatch]); // Added dispatch

    const handleSaveOrUpdateRecipe = async () => {
        clearFeedback();
        if (!state.recipe_name.trim()) {
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

        dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: true });

        const recipePayload = {
            recipe_name: state.recipe_name,
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
                recipe_step_id: step.recipe_step_id && !state.isInTemplateMode ? step.recipe_step_id : undefined // only send if updating existing step
            })),
        };
        
        // If saving from template, currentRecipeId will be null & isInTemplateMode true
        const savingFromTemplate = state.isInTemplateMode && !state.currentRecipeId;

        try {
            let result;
            if (state.currentRecipeId && !savingFromTemplate) { // Update existing recipe
                result = await RecipeService.updateRecipe(state.currentRecipeId, recipePayload);
                dispatch({ type: 'SET_FEEDBACK', payload: { type: 'success', text: 'Recipe updated successfully!' } });
            } else { // Save as new (either from template or brand new)
                result = await RecipeService.saveRecipe(recipePayload);
                dispatch({ type: 'SET_FEEDBACK', payload: { type: 'success', text: 'Recipe saved successfully!' } });
                // Update state for newly saved recipe
                dispatch({ type: 'SET_FIELD', field: 'currentRecipeId', payload: result.recipe.recipe_id });
                dispatch({ type: 'SET_FIELD', field: 'selectedRecipeToLoad', payload: String(result.recipe.recipe_id) });
                if (savingFromTemplate) {
                    dispatch({ type: 'SET_FIELD', field: 'isInTemplateMode', payload: false });
                    setActiveTemplateId(null); // Clear active template highlight
                }
            }
            // Refresh the list of saved recipes
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
        // Optional: Add a confirmation dialog here
        // if (!window.confirm("Are you sure you want to delete this recipe?")) return;

        dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: true }); // Use isSaving to disable buttons
        try {
            await RecipeService.deleteRecipe(state.currentRecipeId);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'success', text: 'Recipe deleted successfully!' } });
            handleClearForm(); // Clear form and set to new state
            fetchUserRecipesList(); // Refresh recipe list
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
            {/* Global title is now in App.js */}
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
            

            {isLoggedIn() && !isLoadingPredefinedSteps && state.baseRecipeTemplates && state.baseRecipeTemplates.length > 0 && (
                <div className={styles.baseTemplatesSection}>
                    <h3>Start with a Template</h3>
                    <p className={styles.templateIntroText}>
                        Select one of our professionally designed sourdough templates to get started.
                        You can adjust the dough weight and then save it as your own recipe.
                    </p>
                    <div className={styles.templateCardsContainer}>
                        {state.baseRecipeTemplates.map(template => (
                            <div
                                key={template.recipe_id}
                                className={`${styles.templateCard} ${template.recipe_id === activeTemplateId ? styles.templateCardActive : ''}`}
                                onClick={() => handleLoadTemplateData(template)}
                                role="button"
                                tabIndex={0}
                                onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLoadTemplateData(template); }}
                            >
                                <div className={styles.templateCardContent}>
                                    <h4>{template.recipe_name}</h4>
                                    <p>{template.description || "A great starting point for your sourdough journey."}</p>
                                </div>
                                
                            </div>
                        ))}
                    </div>
                    {state.isInTemplateMode && (
                <div className={styles.templateModeBanner}>
                    <p><strong>Template Mode:</strong> You are viewing a base template. Adjust inputs and "Save as New Recipe".</p>
                </div>
            )}
                </div>
                
            )}
             {isLoggedIn() && isLoadingBaseTemplates && <p className={styles.loadingMessage}>Loading templates...</p>}


            <div className={styles.recipeCalculatorLayout}>
                <div className={styles.recipeDetailsColumn}>
                    <div className={styles.inputsSection}>
                        <h3>Inputs</h3>
                        <RecipeFields
                            recipe={recipeInputFields}
                            onFieldChange={handleRecipeFieldChange}
                            isSaving={state.isSaving}
                            clearFeedback={clearFeedback}
                            isInputsSection={true}
                            isInTemplateMode={state.isInTemplateMode}
                        />
                    </div>
                    <RecipeResults results={calculationResults} />
                    <div className={styles.manageRecipesSection}>
                         <RecipeManagementActions
                            recipeName={recipeManagementFields.recipe_name}
                            description={recipeManagementFields.description}
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
                            clearFeedback={clearFeedback}
                            // isInTemplateMode might be useful for RecipeManagementActions later
                        />
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