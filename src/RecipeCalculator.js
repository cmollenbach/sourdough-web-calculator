// src/RecipeCalculator.js
import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

import RecipeService from './services/RecipeService'; // Will be used
import RecipeFields from './components/RecipeFields'; // Will be used
import RecipeManagementActions from './components/RecipeManagementActions'; // Will be used
import RecipeResults from './components/RecipeResults'; // Will be used
import StepsColumn from './components/StepsColumn'; // Will be used

import styles from './components/RecipeCalculator.module.css'; // Will be used
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';

// --- Constants ---
const LEVAIN_BUILD_STEP_NAME = 'Levain Build';
const BULK_FERMENT_S_AND_F_STEP_NAME = 'Bulk Fermentation with Stretch and Fold';

const INITIAL_RECIPE_FIELDS = {
    recipe_id: null,
    recipe_name: 'My New Sourdough',
    description: '',
    targetDoughWeight: '1000',
    hydrationPercentage: '70',
    saltPercentage: '2.0',
    steps: []
};

const DEFAULT_LEVAIN_STEP_TEMPLATE = {
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
    // ... (Your complete recipeReducer logic from the previous correct version)
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
                isInTemplateMode: false,
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
                            updatedStep.contribution_pct = DEFAULT_LEVAIN_STEP_TEMPLATE.contribution_pct;
                            updatedStep.target_hydration = DEFAULT_LEVAIN_STEP_TEMPLATE.target_hydration;
                            updatedStep.duration_override = DEFAULT_LEVAIN_STEP_TEMPLATE.duration_override ?? predefined?.defaultDurationMinutes;
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
                    defaultNewStepData.contribution_pct = DEFAULT_LEVAIN_STEP_TEMPLATE.contribution_pct;
                    defaultNewStepData.target_hydration = DEFAULT_LEVAIN_STEP_TEMPLATE.target_hydration;
                    defaultNewStepData.duration_override = DEFAULT_LEVAIN_STEP_TEMPLATE.duration_override ?? firstPredefined.defaultDurationMinutes;
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
            const templateData = action.payload;
            const { predefinedSteps } = action.additionalData;
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
                    temp_client_id: step.recipe_step_id ? null : (step.temp_client_id || Date.now() + index + Math.random()),
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
                currentRecipeId: null,
                selectedRecipeToLoad: '',
                isInTemplateMode: true,
                feedbackMessage: { type: 'info', text: `Loaded template: ${templateData.recipe_name}. Adjust inputs and save as new!` },
            };
        }
        case 'CLEAR_FORM': {
            const { predefinedSteps, levainStepIdDynamic } = action.payload;
            const initialSteps = [];
            if (predefinedSteps && predefinedSteps.length > 0 && levainStepIdDynamic) {
                const levainTemplate = predefinedSteps.find(ps => ps.step_id === levainStepIdDynamic);
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

    if (isNaN(hydrationPercentageNum) || isNaN(starterPercentageNum) || isNaN(starterHydrationNum) || isNaN(saltPercentageNum)) {
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0 };
    }
    if (1 + hydrationPercentageNum === 0) {
         return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0 };
    }

    let finalFlourWeight = 0;
    let finalWaterWeight = 0;
    let finalStarterWeight = 0;
    let saltWeightValue = 0;

    if (starterPercentageNum > 0 && (1 + starterHydrationNum) > 0) {
        finalStarterWeight = targetDoughWeightNum * starterPercentageNum;
        const flourInStarter = finalStarterWeight / (1 + starterHydrationNum);
        const waterInStarter = finalStarterWeight - flourInStarter;

        const totalFlourNumerator = targetDoughWeightNum / (1 + saltPercentageNum);
        const totalFlourDenominator = 1 + hydrationPercentageNum;
        let totalFlourInRecipe = 0;
        if (totalFlourDenominator !== 0) {
            totalFlourInRecipe = totalFlourNumerator / totalFlourDenominator;
        }

        finalFlourWeight = totalFlourInRecipe - flourInStarter;
        saltWeightValue = totalFlourInRecipe * saltPercentageNum;

        const totalWaterInRecipe = totalFlourInRecipe * hydrationPercentageNum;
        finalWaterWeight = totalWaterInRecipe - waterInStarter;
    } else {
        const totalFlourDenominator = 1 + hydrationPercentageNum + saltPercentageNum;
         if (totalFlourDenominator !== 0) {
            finalFlourWeight = targetDoughWeightNum / totalFlourDenominator;
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

    const calculatedTotal = round(finalFlourWeight) + round(finalWaterWeight) + round(finalStarterWeight) + roundSalt(saltWeightValue);

    return {
        flourWeight: round(finalFlourWeight),
        waterWeight: round(finalWaterWeight),
        starterWeight: round(finalStarterWeight),
        saltWeight: roundSalt(saltWeightValue),
        totalWeight: round(calculatedTotal)
    };
}

const getStepDnDId = (step) => step.recipe_step_id || step.temp_client_id;

function RecipeCalculator() {
    const [state, dispatch] = useReducer(recipeReducer, initialState);
    const [calculationResults, setCalculationResults] = useState({
        flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0
    });

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
        const currentPredefinedSteps = predefinedSteps || [];
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
    }, [predefinedSteps, levainStepIdDynamic]);

    const fetchUserRecipesList = useCallback(async () => {
        if (!isLoggedIn()) return;
        dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: true });
        clearFeedback();
        try {
            const data = await RecipeService.getUserRecipes(); // Ensure RecipeService is used
            const recipes = data || [];
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: recipes });
            if (recipes.length === 0 && !state.currentRecipeId) {
                dispatch({ type: 'SET_FEEDBACK', payload: { type: 'info', text: 'No saved recipes found. Create a new one!' } });
            }
        } catch (error) {
            console.error("RecipeCalculator: Error fetching user recipes:", error);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Failed to load recipes: ${error.message}` } });
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: [] });
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: false });
        }
    }, [isLoggedIn, clearFeedback, state.currentRecipeId]);

    useEffect(() => {
        if (isLoggedIn()) {
            fetchUserRecipesList();
        } else {
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: [] });
            if (predefinedSteps && levainStepIdDynamic) {
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
            state.steps.length === 0
        ) {
            handleClearForm();
        }
    }, [ isLoggedIn, predefinedSteps, levainStepIdDynamic, state.currentRecipeId, handleClearForm, state.steps.length ]);

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
                const templates = await RecipeService.getBaseRecipeTemplates(); // Ensure RecipeService is used
                dispatch({ type: 'SET_BASE_RECIPE_TEMPLATES', payload: templates || [] });
            } catch (error) {
                console.error("RecipeCalculator: Error fetching base recipe templates:", error);
                dispatch({
                    type: 'SET_FEEDBACK',
                    payload: { type: 'error', text: `Failed to load base templates: ${error.message}` }
                });
            } finally {
                 dispatch({ type: 'SET_LOADING_BASE_TEMPLATES', payload: false });
            }
        };
        fetchBaseTemplates();
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
            const recipeDataFromApi = await RecipeService.getRecipeById(recipeIdToLoad); // Ensure RecipeService is used
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

     const handleLoadTemplateData = useCallback((template) => {
        dispatch({ type: 'LOAD_TEMPLATE_DATA', payload: template, additionalData: { predefinedSteps: predefinedSteps || [] } });
    }, [predefinedSteps]);

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
        const recipePayload = { /* ... as before ... */ };
        try {
            let result;
            if (state.currentRecipeId) {
                result = await RecipeService.updateRecipe(state.currentRecipeId, recipePayload); // Ensure RecipeService is used
            } else {
                result = await RecipeService.saveRecipe(recipePayload); // Ensure RecipeService is used
            }
            // ... rest of try ...
        } catch (error) { /* ... */ } finally { /* ... */ }
    };
    const handleDeleteRecipe = async () => {
        // ... uses RecipeService.deleteRecipe ...
    };
    const handleStepChange = (index, field, value) => {
        dispatch({
            type: 'UPDATE_STEP',
            index,
            payload: { [field]: value },
            additionalContext: { predefinedSteps, levainStepIdDynamic, bulkFermentStepIdDynamic }
        });
    };
    const handleAddStep = () => {
        dispatch({ type: 'ADD_STEP', payload: { predefinedSteps, levainStepIdDynamic, bulkFermentStepIdDynamic } });
    };
    const handleDeleteStep = (indexToDelete) => dispatch({ type: 'DELETE_STEP', index: indexToDelete });
    function handleDragEnd(event) {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = state.steps.findIndex(item => getStepDnDId(item) === active.id);
            const newIndex = state.steps.findIndex(item => getStepDnDId(item) === over.id);
            if (oldIndex === -1 || newIndex === -1) return;
            const reorderedSteps = arrayMove(state.steps, oldIndex, newIndex); // Uses arrayMove
            dispatch({ type: 'REORDER_STEPS', payload: reorderedSteps });
        }
    }

    return (
        <>
            <h2 className={styles.mainTitle}>Sourdough Recipe Calculator</h2> {/* Uses styles */}
            {predefinedStepsError && (
                <p className={`${styles.feedbackMessage} ${styles.feedbackMessageError}`}> {/* Uses styles */}
                    {predefinedStepsError}
                </p>
            )}
            {state.feedbackMessage.text && (
                <p className={`${styles.feedbackMessage} ${ /* Uses styles */
                    state.feedbackMessage.type === 'error' ? styles.feedbackMessageError :
                    (state.feedbackMessage.type === 'success' ? styles.feedbackMessageSuccess : styles.feedbackMessageInfo)
                }`}>
                    {state.feedbackMessage.text}
                </p>
            )}
            {isLoggedIn() && state.baseRecipeTemplates && state.baseRecipeTemplates.length > 0 && (
                <div className={styles.baseTemplatesSection}> {/* Uses styles */}
                    <h3>Start with a Template</h3>
                    <ul>
                        {state.baseRecipeTemplates.map(template => (
                            <li key={template.recipe_id}>
                                <h4>{template.recipe_name}</h4>
                                <p>{template.description}</p>
                                <button onClick={() => handleLoadTemplateData(template)}> {/* Uses handleLoadTemplateData */}
                                    Use this Template
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <div className={styles.recipeCalculatorLayout}> {/* Uses styles */}
                <div className={styles.recipeDetailsColumn}> {/* Uses styles */}
                    <div className={styles.inputsSection}> {/* Uses styles */}
                        <h3>Inputs</h3>
                        <RecipeFields
                            recipe={recipeInputFields}
                            onFieldChange={handleRecipeFieldChange}
                            isSaving={state.isSaving}
                            clearFeedback={clearFeedback}
                            isInputsSection={true}
                            isInTemplateMode={state.isInTemplateMode}
                        /> {/* Uses RecipeFields, recipeInputFields, handleRecipeFieldChange */}
                    </div>
                    <RecipeResults results={calculationResults} /> {/* Uses RecipeResults, calculationResults */}
                    <div className={styles.manageRecipesSection}> {/* Uses styles */}
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
                            isInTemplateMode={state.isInTemplateMode}
                        /> {/* Uses RecipeManagementActions, recipeManagementFields, handleRecipeFieldChange, handleLoadRecipeChange, handleSaveOrUpdateRecipe, handleDeleteRecipe */}
                    </div>
                </div>
                <StepsColumn
                    recipeSteps={state.steps}
                    predefinedSteps={predefinedSteps}
                    onStepChange={handleStepChange}
                    onDeleteStep={handleDeleteStep}
                    onAddStep={handleAddStep}
                    onDragEnd={handleDragEnd} // Uses handleDragEnd
                    isLoadingPredefinedSteps={isLoadingPredefinedSteps}
                    isSaving={state.isSaving}
                    bulkFermentStepId={bulkFermentStepIdDynamic}
                    levainStepId={levainStepIdDynamic}
                    getStepDnDId={getStepDnDId} // Uses getStepDnDId
                    isInTemplateMode={state.isInTemplateMode}
                /> {/* Uses StepsColumn, handleStepChange, handleDeleteStep, handleAddStep */}
            </div>
        </>
    );
}

export default RecipeCalculator;