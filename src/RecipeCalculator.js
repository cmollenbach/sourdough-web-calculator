// src/RecipeCalculator.js
import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

import AuthService from './services/AuthService';
import RecipeService from './services/RecipeService';
import RecipeFields from './components/RecipeFields';
import RecipeManagementActions from './components/RecipeManagementActions';
import RecipeResults from './components/RecipeResults';
import StepsColumn from './components/StepsColumn';

import styles from './components/RecipeCalculator.module.css';

// --- Constants ---
const LEVAIN_BUILD_STEP_NAME = 'Levain Build';
const BULK_FERMENT_S_AND_F_STEP_NAME = 'Bulk Fermentation with Stretch and Fold';

const INITIAL_RECIPE_FIELDS = {
    recipe_id: null,
    recipe_name: 'My New Sourdough',
    description: '',
    targetDoughWeight: '1000',
    hydrationPercentage: '70',
    saltPercentage: '2.0', // Updated to allow for decimal
    steps: []
};

const DEFAULT_LEVAIN_STEP_TEMPLATE = {
    step_name: LEVAIN_BUILD_STEP_NAME,
    duration_override: null,
    notes: '',
    target_temperature_celsius: null,
    contribution_pct: 20,
    target_hydration: 100,
};

// --- Reducer ---
const initialState = {
    ...INITIAL_RECIPE_FIELDS,
    currentRecipeId: null,
    isLoadingPredefinedSteps: false,
    isLoadingRecipes: false,
    isSaving: false,
    feedbackMessage: { type: '', text: '' },
    savedRecipes: [],
    predefinedSteps: [],
    selectedRecipeToLoad: '',
    levainStepIdDynamic: null,
    bulkFermentStepIdDynamic: null,
};

function recipeReducer(state, action) {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.payload };
        case 'SET_RECIPE_FIELD':
            return { ...state, [action.field]: action.payload, feedbackMessage: { type: '', text: '' } };
        case 'SET_FULL_RECIPE_FORM':
            return {
                ...state,
                recipe_name: action.payload.recipeData.recipe_name,
                description: action.payload.recipeData.description,
                targetDoughWeight: String(action.payload.recipeData.targetDoughWeight),
                hydrationPercentage: String(action.payload.recipeData.hydrationPercentage),
                saltPercentage: String(parseFloat(action.payload.recipeData.saltPercentage).toFixed(1)), // Ensure one decimal place
                steps: action.payload.recipeData.steps,
                currentRecipeId: action.payload.recipeData.recipe_id || null,
                selectedRecipeToLoad: String(action.payload.recipeData.recipe_id || ''),
                feedbackMessage: { type: '', text: '' },
            };
        case 'SET_STEPS':
            return { ...state, steps: action.payload };
        case 'UPDATE_STEP':
            return {
                ...state,
                steps: state.steps.map((step, i) =>
                    i === action.index ? { ...step, ...action.payload } : step
                ),
            };
        case 'ADD_STEP': {
            const maxOrder = state.steps.reduce((max, step) => Math.max(max, step.step_order || 0), 0);
            let defaultNewStepData = {
                step_id: null,
                step_name: 'New Step',
                duration_override: null,
                notes: '',
                target_temperature_celsius: null,
                contribution_pct: null,
                target_hydration: null,
                stretch_fold_interval_minutes: null,
            };

            if (state.predefinedSteps.length > 0) {
                const firstPredefined = state.predefinedSteps[0];
                defaultNewStepData = {
                    ...defaultNewStepData,
                    step_id: firstPredefined.step_id,
                    step_name: firstPredefined.step_name,
                    duration_override: firstPredefined.defaultDurationMinutes ?? null,
                };
                if (firstPredefined.step_id === state.levainStepIdDynamic) {
                    defaultNewStepData.contribution_pct = DEFAULT_LEVAIN_STEP_TEMPLATE.contribution_pct;
                    defaultNewStepData.target_hydration = DEFAULT_LEVAIN_STEP_TEMPLATE.target_hydration;
                    defaultNewStepData.duration_override = DEFAULT_LEVAIN_STEP_TEMPLATE.duration_override ?? firstPredefined.defaultDurationMinutes;
                } else if (firstPredefined.step_id === state.bulkFermentStepIdDynamic) {
                    defaultNewStepData.stretch_fold_interval_minutes = 30;
                }
            }

            return {
                ...state,
                steps: [
                    ...state.steps,
                    {
                        ...defaultNewStepData,
                        temp_client_id: Date.now() + Math.random(),
                        step_order: maxOrder + 1,
                    },
                ],
            };
        }
        case 'DELETE_STEP':
            return {
                ...state,
                steps: state.steps
                    .filter((_, i) => i !== action.index)
                    .map((step, i) => ({ ...step, step_order: i + 1 })),
            };
        case 'REORDER_STEPS':
            return {
                ...state,
                steps: action.payload.map((step, i) => ({ ...step, step_order: i + 1 })),
            };
        case 'SET_LOADING':
            return { ...state, [action.field]: action.payload };
        case 'SET_FEEDBACK':
            return { ...state, feedbackMessage: action.payload };
        case 'CLEAR_FEEDBACK':
            return { ...state, feedbackMessage: { type: '', text: '' } };
        case 'CLEAR_FORM':
            const initialSteps = [];
            if (state.predefinedSteps.length > 0 && state.levainStepIdDynamic) {
                const levainTemplate = state.predefinedSteps.find(ps => ps.step_id === state.levainStepIdDynamic);
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
                saltPercentage: parseFloat(INITIAL_RECIPE_FIELDS.saltPercentage).toFixed(1), // Ensure one decimal on clear
                steps: initialSteps,
                currentRecipeId: null,
                selectedRecipeToLoad: '',
                feedbackMessage: { type: '', text: '' },
            };
        case 'SET_PREDEFINED_DATA':
            return {
                ...state,
                predefinedSteps: action.payload.predefinedSteps,
                levainStepIdDynamic: action.payload.levainStepId,
                bulkFermentStepIdDynamic: action.payload.bulkFermentStepId,
            };
        default:
            return state;
    }
}

// --- Helper Functions ---
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
    let saltWeightValue = 0; // Renamed to avoid conflict

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
        saltWeightValue = totalFlourInRecipe * saltPercentageNum; // Use renamed variable

        const totalWaterInRecipe = totalFlourInRecipe * hydrationPercentageNum;
        finalWaterWeight = totalWaterInRecipe - waterInStarter;
    } else {
        const totalFlourDenominator = 1 + hydrationPercentageNum + saltPercentageNum;
         if (totalFlourDenominator !== 0) {
            finalFlourWeight = targetDoughWeightNum / totalFlourDenominator;
            finalWaterWeight = finalFlourWeight * hydrationPercentageNum;
            saltWeightValue = finalFlourWeight * saltPercentageNum; // Use renamed variable
        }
    }

    const round = (num) => {
        if (isNaN(num) || !isFinite(num)) return 0;
        return Math.round(num);
    }
     const roundSalt = (num) => {
        if (isNaN(num) || !isFinite(num)) return 0;
        return parseFloat(num.toFixed(1)); // Keep one decimal for salt
    }


    const calculatedTotal = round(finalFlourWeight) + round(finalWaterWeight) + round(finalStarterWeight) + roundSalt(saltWeightValue);

    return {
        flourWeight: round(finalFlourWeight),
        waterWeight: round(finalWaterWeight),
        starterWeight: round(finalStarterWeight),
        saltWeight: roundSalt(saltWeightValue), // Use renamed variable
        totalWeight: round(calculatedTotal)
    };
}

const getStepDnDId = (step) => step.recipe_step_id || step.temp_client_id;


// --- Component ---
function RecipeCalculator() {
    const [state, dispatch] = useReducer(recipeReducer, initialState);
    const [calculationResults, setCalculationResults] = useState({ flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0 });

    const clearFeedback = useCallback(() => dispatch({ type: 'CLEAR_FEEDBACK' }), []);

    const recipeInputFields = { // For RecipeFields - Inputs section
        targetDoughWeight: state.targetDoughWeight,
        hydrationPercentage: state.hydrationPercentage,
        saltPercentage: state.saltPercentage,
    };
     const recipeManagementFields = { // For RecipeFields - Manage Recipes section
        recipe_name: state.recipe_name,
        description: state.description,
    };


    const handleRecipeFieldChange = (field, value) => {
        dispatch({ type: 'SET_RECIPE_FIELD', field, payload: value });
    };

    const processLoadedRecipeData = useCallback((recipeData, predefinedStepsFromState) => {
        const processedSteps = (recipeData.steps || []).map((step, index) => {
            const predefined = predefinedStepsFromState.find(ps => ps.step_id === step.step_id);
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
        return { ...recipeData, steps: processedSteps, saltPercentage: parseFloat(recipeData.saltPercentage).toFixed(1) };
    }, []);


    const fetchAndSetPredefinedSteps = useCallback(async () => {
        if (!AuthService.isLoggedIn()) return;
        dispatch({ type: 'SET_LOADING', field: 'isLoadingPredefinedSteps', payload: true });
        try {
            const data = await RecipeService.getPredefinedSteps();
            const predefinedSteps = data || [];
            const levainStep = predefinedSteps.find(s => s.step_name === LEVAIN_BUILD_STEP_NAME);
            const bulkFermentStep = predefinedSteps.find(s => s.step_name === BULK_FERMENT_S_AND_F_STEP_NAME);

            dispatch({
                type: 'SET_PREDEFINED_DATA',
                payload: {
                    predefinedSteps,
                    levainStepId: levainStep ? levainStep.step_id : null,
                    bulkFermentStepId: bulkFermentStep ? bulkFermentStep.step_id : null,
                }
            });
        } catch (error) {
            console.error("RecipeCalculator: Error fetching predefined steps:", error);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Failed to load step types: ${error.message}` } });
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isLoadingPredefinedSteps', payload: false });
        }
    }, []);

    const handleClearForm = useCallback(() => {
        dispatch({ type: 'CLEAR_FORM' });
    }, []);

    const fetchUserRecipesList = useCallback(async () => {
        if (!AuthService.isLoggedIn()) {
            return;
        }
        dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: true });
        clearFeedback();
        try {
            const data = await RecipeService.getUserRecipes();
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
    }, [clearFeedback, state.currentRecipeId]);


    useEffect(() => {
        if (AuthService.isLoggedIn()) {
            fetchAndSetPredefinedSteps();
            fetchUserRecipesList();
        } else {
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: [] });
            dispatch({ type: 'SET_FIELD', field: 'predefinedSteps', payload: [] });
            dispatch({ type: 'SET_FIELD', field: 'levainStepIdDynamic', payload: null });
            dispatch({ type: 'SET_FIELD', field: 'bulkFermentStepIdDynamic', payload: null });
            handleClearForm();
        }
    }, [handleClearForm, fetchUserRecipesList, fetchAndSetPredefinedSteps]);


    useEffect(() => {
        if (
            AuthService.isLoggedIn() &&
            state.predefinedSteps.length > 0 &&
            state.levainStepIdDynamic &&
            !state.currentRecipeId &&
            state.steps.length === 0
        ) {
            handleClearForm();
        }
    }, [
        state.predefinedSteps,
        state.levainStepIdDynamic,
        state.currentRecipeId,
        handleClearForm, // Added dependency
        state.steps.length // Added dependency
    ]);


    useEffect(() => {
        const newResults = calculateRecipe(
            state.targetDoughWeight,
            state.hydrationPercentage,
            state.saltPercentage,
            state.steps,
            state.levainStepIdDynamic
        );
        setCalculationResults(newResults);
    }, [state.targetDoughWeight, state.hydrationPercentage, state.saltPercentage, state.steps, state.levainStepIdDynamic]);


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
            const processedData = processLoadedRecipeData(recipeDataFromApi, state.predefinedSteps);
            dispatch({ type: 'SET_FULL_RECIPE_FORM', payload: { recipeData: processedData } });
        } catch (error) {
            console.error("RecipeCalculator: Error fetching specific recipe:", error);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Failed to load recipe: ${error.message}` } });
            handleClearForm();
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: false });
        }
    };

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
            if (step.step_id === state.levainStepIdDynamic && (step.contribution_pct == null || step.target_hydration == null)) {
                dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Levain Build step requires Contribution % and Starter Hydration %.`}});
                return;
            }
            if (step.step_id === state.bulkFermentStepIdDynamic) {
                if (step.duration_override == null || step.stretch_fold_interval_minutes == null) {
                    dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: `Bulk Fermentation with S&F step requires Total Bulk Time and S&F Interval.` }});
                    return;
                }
            }
        }

        dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: true });
        const recipePayload = {
            recipe_name: state.recipe_name.trim(),
            description: state.description.trim(),
            targetDoughWeight: parseFloat(state.targetDoughWeight),
            hydrationPercentage: parseFloat(state.hydrationPercentage),
            saltPercentage: parseFloat(state.saltPercentage),
            steps: state.steps.map(step => ({
                recipe_step_id: step.recipe_step_id,
                step_id: Number(step.step_id),
                step_order: Number(step.step_order),
                duration_override: step.duration_override != null ? Number(step.duration_override) : null,
                notes: step.notes || null,
                target_temperature_celsius: step.target_temperature_celsius != null ? Number(step.target_temperature_celsius) : null,
                contribution_pct: step.contribution_pct != null ? Number(step.contribution_pct) : null,
                target_hydration: step.target_hydration != null ? Number(step.target_hydration) : null,
                stretch_fold_interval_minutes: step.stretch_fold_interval_minutes != null ? Number(step.stretch_fold_interval_minutes) : null,
            }))
        };

        try {
            let result;
            if (state.currentRecipeId) {
                result = await RecipeService.updateRecipe(state.currentRecipeId, recipePayload);
            } else {
                result = await RecipeService.saveRecipe(recipePayload);
            }
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'success', text: result.message || `Recipe ${state.currentRecipeId ? 'updated' : 'saved'} successfully!` }});
            
            const previousSelectedRecipe = state.selectedRecipeToLoad;
            await fetchUserRecipesList();
            
            if (result.recipe && result.recipe.recipe_id) { 
                const processedData = processLoadedRecipeData(result.recipe, state.predefinedSteps);
                dispatch({ type: 'SET_FULL_RECIPE_FORM', payload: { recipeData: processedData } });
            } else if (!state.currentRecipeId) {
                const newlySaved = state.savedRecipes.find(r => r.recipe_name === recipePayload.recipe_name && !r.recipe_id);
                if(newlySaved && newlySaved.recipe_id){
                    dispatch({ type: 'SET_FIELD', field: 'selectedRecipeToLoad', payload: String(newlySaved.recipe_id) });
                } else {
                    handleClearForm();
                }
            } else {
                 dispatch({ type: 'SET_FIELD', field: 'selectedRecipeToLoad', payload: previousSelectedRecipe });
            }

        } catch (error) {
            console.error(`RecipeCalculator: Error ${state.currentRecipeId ? 'updating' : 'saving'} recipe:`, error);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: error.message || `Failed to ${state.currentRecipeId ? 'update' : 'save'} recipe.` } });
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: false });
        }
    };

    const handleDeleteRecipe = async () => {
        clearFeedback();
        if (!state.currentRecipeId) {
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: 'No recipe selected to delete.' } }); return;
        }
        if (!window.confirm(`Are you sure you want to delete the recipe "${state.recipe_name}"?`)) return;

        dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: true });
        try {
            const result = await RecipeService.deleteRecipe(state.currentRecipeId);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'success', text: result.message || 'Recipe deleted successfully.'}});
            handleClearForm();
            await fetchUserRecipesList();
        } catch (error) {
            console.error(`RecipeCalculator: Error deleting recipe:`, error);
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', text: error.message || 'Failed to delete recipe.'}});
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: false });
        }
    };

    const handleStepChange = (index, field, value) => {
        const updatedStep = { ...state.steps[index], [field]: value };

        if (field === 'step_id') {
            const predefined = state.predefinedSteps.find(ps => ps.step_id === Number(value));
            updatedStep.step_name = predefined ? predefined.step_name : 'Custom Step';
            
            updatedStep.contribution_pct = null;
            updatedStep.target_hydration = null;
            updatedStep.stretch_fold_interval_minutes = null;
            updatedStep.duration_override = predefined?.defaultDurationMinutes ?? null;

            if (Number(value) === state.levainStepIdDynamic) {
                updatedStep.contribution_pct = DEFAULT_LEVAIN_STEP_TEMPLATE.contribution_pct;
                updatedStep.target_hydration = DEFAULT_LEVAIN_STEP_TEMPLATE.target_hydration;
                updatedStep.duration_override = DEFAULT_LEVAIN_STEP_TEMPLATE.duration_override ?? predefined?.defaultDurationMinutes;

            } else if (Number(value) === state.bulkFermentStepIdDynamic) {
                updatedStep.stretch_fold_interval_minutes = 30;
            }
        }
        dispatch({ type: 'UPDATE_STEP', index, payload: updatedStep });
    };

    const handleAddStep = () => dispatch({ type: 'ADD_STEP' });
    const handleDeleteStep = (indexToDelete) => dispatch({ type: 'DELETE_STEP', index: indexToDelete });

    function handleDragEnd(event) {
        const { active, over } = event;
        if (active.id !== over.id && over) {
            const oldIndex = state.steps.findIndex(item => getStepDnDId(item) === active.id);
            const newIndex = state.steps.findIndex(item => getStepDnDId(item) === over.id);
            
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedSteps = arrayMove(state.steps, oldIndex, newIndex);
            dispatch({ type: 'REORDER_STEPS', payload: reorderedSteps });
        }
    }

    return (
        <>
            <h2 className={styles.mainTitle}>Sourdough Recipe Calculator</h2>
            <div className={styles.recipeCalculatorLayout}>
                <div className={styles.recipeDetailsColumn}>
                    
                    {state.feedbackMessage.text && (
                        <p className={`${styles.feedbackMessage} ${state.feedbackMessage.type === 'error' ? styles.feedbackMessageError : (state.feedbackMessage.type === 'success' ? styles.feedbackMessageSuccess : styles.feedbackMessageInfo)}`}>
                            {state.feedbackMessage.text}
                        </p>
                    )}

                    <div className={styles.inputsSection}>
                        <h3>Inputs</h3>
                        <RecipeFields
                            recipe={recipeInputFields} // Pass only input-related fields
                            onFieldChange={handleRecipeFieldChange}
                            isSaving={state.isSaving}
                            clearFeedback={clearFeedback}
                            isInputsSection={true} // Flag to render only relevant fields
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
                        />
                    </div>
                </div>

                <StepsColumn
                    recipeSteps={state.steps}
                    predefinedSteps={state.predefinedSteps}
                    onStepChange={handleStepChange}
                    onDeleteStep={handleDeleteStep}
                    onAddStep={handleAddStep}
                    onDragEnd={handleDragEnd}
                    isLoadingPredefinedSteps={state.isLoadingPredefinedSteps}
                    isSaving={state.isSaving}
                    bulkFermentStepId={state.bulkFermentStepIdDynamic}
                    levainStepId={state.levainStepIdDynamic}
                    getStepDnDId={getStepDnDId}
                />
            </div>
        </>
    );
}

export default RecipeCalculator;