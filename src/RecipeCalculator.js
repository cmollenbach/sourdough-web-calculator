// src/RecipeCalculator.js
import React, { useState, useEffect, useCallback } from 'react';
import './RecipeCalculator.css';
import AuthService from './services/AuthService';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableStepItem } from './components/SortableStepItem'; // Ensure this path is correct

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

const INITIAL_RECIPE_STATE = {
    recipe_id: null,
    recipe_name: 'My New Sourdough',
    description: '',
    targetDoughWeight: '1000',
    hydrationPercentage: '70',
    saltPercentage: '2',
    steps: []
};

let LEVAIN_BUILD_STEP_ID_DYNAMIC = null;
let BULK_FERMENT_S_AND_F_STEP_ID_DYNAMIC = null;

const LEVAIN_BUILD_STEP_NAME = 'Levain Build';
const BULK_FERMENT_S_AND_F_STEP_NAME = 'Bulk Fermentation with Stretch and Fold';

const DEFAULT_LEVAIN_STEP_TEMPLATE = { // Used as a template
    step_id: null,
    step_name: LEVAIN_BUILD_STEP_NAME,
    step_order: 1,
    duration_override: null,
    notes: '',
    target_temperature_celsius: null,
    contribution_pct: 20,
    target_hydration: 100,
    // temp_client_id will be added in handleAddStep
};


function calculateRecipe(
    targetDoughWeight,
    hydrationPercentage,
    saltPercentage,
    steps = []
) {
    if (targetDoughWeight <= 0) {
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0 };
    }

    const targetDoughWeightNum = parseFloat(targetDoughWeight);
    const hydrationPercentageNum = parseFloat(hydrationPercentage) / 100.0;
    const saltPercentageNum = parseFloat(saltPercentage) / 100.0;

    const levainStep = steps.find(step =>
        step.step_id === LEVAIN_BUILD_STEP_ID_DYNAMIC &&
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
    let saltWeight = 0;

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
        saltWeight = totalFlourInRecipe * saltPercentageNum;

        const totalWaterInRecipe = totalFlourInRecipe * hydrationPercentageNum;
        finalWaterWeight = totalWaterInRecipe - waterInStarter;
    } else {
        const totalFlourDenominator = 1 + hydrationPercentageNum + saltPercentageNum;
         if (totalFlourDenominator !== 0) {
            finalFlourWeight = targetDoughWeightNum / totalFlourDenominator;
            finalWaterWeight = finalFlourWeight * hydrationPercentageNum;
            saltWeight = finalFlourWeight * saltPercentageNum;
        }
    }

    const round = (num) => {
        if (isNaN(num) || !isFinite(num)) return 0;
        return Math.round(num * 10) / 10;
    }

    const calculatedTotal = round(finalFlourWeight) + round(finalWaterWeight) + round(finalStarterWeight) + round(saltWeight);

    return {
        flourWeight: round(finalFlourWeight),
        waterWeight: round(finalWaterWeight),
        starterWeight: round(finalStarterWeight),
        saltWeight: round(saltWeight),
        totalWeight: round(calculatedTotal)
    };
}


function RecipeCalculator() {
    const [recipeName, setRecipeName] = useState(INITIAL_RECIPE_STATE.recipe_name);
    const [description, setDescription] = useState(INITIAL_RECIPE_STATE.description);
    const [targetDoughWeight, setTargetDoughWeight] = useState(INITIAL_RECIPE_STATE.targetDoughWeight);
    const [hydrationPercentage, setHydrationPercentage] = useState(INITIAL_RECIPE_STATE.hydrationPercentage);
    const [saltPercentage, setSaltPercentage] = useState(INITIAL_RECIPE_STATE.saltPercentage);
    const [currentRecipeId, setCurrentRecipeId] = useState(null);
    const [recipeSteps, setRecipeSteps] = useState([]);
    const [predefinedSteps, setPredefinedSteps] = useState([]);
    const [isLoadingPredefinedSteps, setIsLoadingPredefinedSteps] = useState(false);
    const [results, setResults] = useState({ flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0 });
    const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [savedRecipes, setSavedRecipes] = useState([]);
    const [selectedRecipeToLoad, setSelectedRecipeToLoad] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const clearFeedback = useCallback(() => setFeedbackMessage({ type: '', text: '' }), []);

    // Function to ensure each step has a unique ID for dnd-kit
    // Uses recipe_step_id if available (from DB), otherwise temp_client_id
    const getStepDnDId = (step) => step.recipe_step_id || step.temp_client_id;


    const fetchPredefinedSteps = useCallback(async () => {
        if (!AuthService.isLoggedIn()) return;
        setIsLoadingPredefinedSteps(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/steps`, {
                headers: AuthService.getAuthHeader(),
            });
            if (!response.ok) throw new Error(`HTTP error fetching step types! status: ${response.status}`);
            const data = await response.json();
            setPredefinedSteps(data || []);

            const levainStepFromAPI = data.find(s => s.step_name === LEVAIN_BUILD_STEP_NAME);
            if (levainStepFromAPI) {
                LEVAIN_BUILD_STEP_ID_DYNAMIC = levainStepFromAPI.step_id;
            }
            const bulkSFStepFromAPI = data.find(s => s.step_name === BULK_FERMENT_S_AND_F_STEP_NAME);
            if (bulkSFStepFromAPI) {
                BULK_FERMENT_S_AND_F_STEP_ID_DYNAMIC = bulkSFStepFromAPI.step_id;
            }
        } catch (error) {
            console.error("RecipeCalculator: Error fetching predefined steps:", error);
            setFeedbackMessage({ type: 'error', text: `Failed to load step types: ${error.message}` });
        } finally {
            setIsLoadingPredefinedSteps(false);
        }
    }, []);

    useEffect(() => {
        fetchPredefinedSteps();
    }, [fetchPredefinedSteps]);

    const setFormStateFromRecipe = useCallback((recipeData) => {
        setRecipeName(String(recipeData.recipe_name || INITIAL_RECIPE_STATE.recipe_name));
        setDescription(String(recipeData.description || INITIAL_RECIPE_STATE.description));
        setTargetDoughWeight(String(recipeData.targetDoughWeight || INITIAL_RECIPE_STATE.targetDoughWeight));
        setHydrationPercentage(String(recipeData.hydrationPercentage || INITIAL_RECIPE_STATE.hydrationPercentage));
        setSaltPercentage(String(recipeData.saltPercentage || INITIAL_RECIPE_STATE.saltPercentage));
        setCurrentRecipeId(recipeData.recipe_id || null);
        setSelectedRecipeToLoad(String(recipeData.recipe_id || ''));

        const processedSteps = (recipeData.steps || []).map((step, index) => {
            const predefined = predefinedSteps.find(ps => ps.step_id === step.step_id);
            return {
                ...step,
                step_name: step.step_name || (predefined ? predefined.step_name : `Unknown Step ID ${step.step_id}`),
                duration_override: step.duration_override != null ? Number(step.duration_override) : null,
                target_temperature_celsius: step.target_temperature_celsius != null ? Number(step.target_temperature_celsius) : null,
                contribution_pct: step.contribution_pct != null ? Number(step.contribution_pct) : null,
                target_hydration: step.target_hydration != null ? Number(step.target_hydration) : null,
                stretch_fold_interval_minutes: step.stretch_fold_interval_minutes != null ? Number(step.stretch_fold_interval_minutes) : null,
                // For DND, ensure a unique client-side ID if recipe_step_id isn't present (e.g., for steps in a new, unsaved recipe)
                // However, recipe_step_id should be present for saved steps.
                // If steps are from a new recipe template before first save, they won't have recipe_step_id.
                temp_client_id: step.recipe_step_id ? null : (step.temp_client_id || Date.now() + index), // Use existing temp_client_id or generate
            };
        });
        setRecipeSteps(processedSteps);
    }, [predefinedSteps]);

    const handleClearForm = useCallback(() => {
        setRecipeName(INITIAL_RECIPE_STATE.recipe_name);
        setDescription(INITIAL_RECIPE_STATE.description);
        setTargetDoughWeight(INITIAL_RECIPE_STATE.targetDoughWeight);
        setHydrationPercentage(INITIAL_RECIPE_STATE.hydrationPercentage);
        setSaltPercentage(INITIAL_RECIPE_STATE.saltPercentage);
        setCurrentRecipeId(null);
        setSelectedRecipeToLoad('');

        let initialSteps = [];
        if (predefinedSteps.length > 0) {
            const levainTemplate = predefinedSteps.find(ps => ps.step_name === LEVAIN_BUILD_STEP_NAME);
            if (levainTemplate) {
                LEVAIN_BUILD_STEP_ID_DYNAMIC = levainTemplate.step_id; // Ensure it's set
                initialSteps = [{
                    ...DEFAULT_LEVAIN_STEP_TEMPLATE,
                    step_id: levainTemplate.step_id,
                    step_name: levainTemplate.step_name,
                    temp_client_id: Date.now() // Unique ID for new step
                }];
            }
        }
        setRecipeSteps(initialSteps);
        clearFeedback();
    }, [clearFeedback, predefinedSteps]);


    const fetchUserRecipes = useCallback(async () => {
        if (!AuthService.isLoggedIn()) {
            setSavedRecipes([]);
            handleClearForm();
            return;
        }
        setIsLoadingRecipes(true);
        clearFeedback();
        try {
            const response = await fetch(`${API_BASE_URL}/api/recipes`, {
                headers: AuthService.getAuthHeader(),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setSavedRecipes(data || []);
            if (data.length === 0) {
                setFeedbackMessage({ type: 'info', text: 'No saved recipes found.' });
                handleClearForm();
            }
        } catch (error) {
            console.error("RecipeCalculator: Error fetching user recipes:", error);
            setFeedbackMessage({ type: 'error', text: `Failed to load recipes: ${error.message}` });
            setSavedRecipes([]);
            handleClearForm();
        } finally {
            setIsLoadingRecipes(false);
        }
    }, [clearFeedback, handleClearForm]);


    useEffect(() => {
        if (AuthService.isLoggedIn()) {
            fetchUserRecipes();
        } else {
             // If we log out, clear the form.
            handleClearForm();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [AuthService.isLoggedIn()]); // fetchUserRecipes and handleClearForm are stable due to useCallback with empty deps

    useEffect(() => {
        const newResults = calculateRecipe(
            targetDoughWeight,
            hydrationPercentage,
            saltPercentage,
            recipeSteps
        );
        setResults(newResults);
    }, [targetDoughWeight, hydrationPercentage, saltPercentage, recipeSteps]);

    const handleLoadRecipe = async (event) => {
        clearFeedback();
        const recipeIdToLoad = event.target.value;

        if (!recipeIdToLoad) {
            handleClearForm();
            return;
        }
        setSelectedRecipeToLoad(recipeIdToLoad);

        setIsLoadingRecipes(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeIdToLoad}`, {
                headers: AuthService.getAuthHeader(),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }
            const recipeData = await response.json();
            setFormStateFromRecipe(recipeData);
        } catch (error) {
            console.error("RecipeCalculator: Error fetching specific recipe:", error);
            setFeedbackMessage({ type: 'error', text: `Failed to load recipe: ${error.message}` });
            handleClearForm();
        } finally {
            setIsLoadingRecipes(false);
        }
    };

     useEffect(() => {
        // Initialize with a default Levain step if no recipe is loaded and user is logged in
        if (!currentRecipeId && AuthService.isLoggedIn() && predefinedSteps.length > 0 && recipeSteps.length === 0) {
            handleClearForm();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentRecipeId, predefinedSteps, AuthService.isLoggedIn()]);


    const handleSaveOrUpdateRecipe = async () => {
        clearFeedback();
        if (!recipeName.trim()) {
            setFeedbackMessage({ type: 'error', text: 'Recipe name is required.' });
            return;
        }
        if (recipeSteps.length === 0) {
            setFeedbackMessage({ type: 'error', text: 'At least one recipe step is required.' });
            return;
        }

        for (const step of recipeSteps) {
            if (step.step_id == null || step.step_order == null) {
                 setFeedbackMessage({ type: 'error', text: `Each step must have a type and order.`});
                 return;
            }
            if (step.step_id === LEVAIN_BUILD_STEP_ID_DYNAMIC && (step.contribution_pct == null || step.target_hydration == null)) {
                setFeedbackMessage({ type: 'error', text: `Levain Build step requires Contribution % and Starter Hydration %.`});
                return;
            }
            if (step.step_id === BULK_FERMENT_S_AND_F_STEP_ID_DYNAMIC) {
                if (step.duration_override == null || step.stretch_fold_interval_minutes == null) {
                    setFeedbackMessage({ type: 'error', text: `Bulk Fermentation with S&F step requires Total Bulk Time and S&F Interval.` });
                    return;
                }
            }
        }


        setIsSaving(true);
        const recipeData = {
            recipe_name: recipeName.trim(),
            description: description.trim(),
            targetDoughWeight: parseFloat(targetDoughWeight),
            hydrationPercentage: parseFloat(hydrationPercentage),
            saltPercentage: parseFloat(saltPercentage),
            steps: recipeSteps.map(step => ({
                step_id: Number(step.step_id),
                step_order: Number(step.step_order), // Ensure step_order is correctly set from DND
                duration_override: step.duration_override != null ? Number(step.duration_override) : null,
                notes: step.notes || null,
                target_temperature_celsius: step.target_temperature_celsius != null ? Number(step.target_temperature_celsius) : null,
                contribution_pct: step.contribution_pct != null ? Number(step.contribution_pct) : null,
                target_hydration: step.target_hydration != null ? Number(step.target_hydration) : null,
                stretch_fold_interval_minutes: step.stretch_fold_interval_minutes != null ? Number(step.stretch_fold_interval_minutes) : null,
            }))
        };

        let url = `${API_BASE_URL}/api/recipes`;
        let method = 'POST';

        if (currentRecipeId) {
            url = `${API_BASE_URL}/api/recipes/${currentRecipeId}`;
            method = 'PUT';
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: { ...AuthService.getAuthHeader(), 'Content-Type': 'application/json', },
                body: JSON.stringify(recipeData),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `HTTP error! status: ${response.status}`);
            
            setFeedbackMessage({ type: 'success', text: result.message || `Recipe ${method === 'POST' ? 'saved' : 'updated'} successfully!` });
            
            await fetchUserRecipes(); // Update dropdown
            
            // Use the recipe data from the response if available (should include all details including steps)
            if (result.recipe) {
                setFormStateFromRecipe(result.recipe);
                setSelectedRecipeToLoad(String(result.recipe.recipe_id)); // Ensure dropdown is also selected
            } else if (method === 'POST') { // Fallback if new recipe data isn't fully returned
                handleClearForm();
            }


        } catch (error) {
            console.error(`RecipeCalculator: Error ${method === 'POST' ? 'saving' : 'updating'} recipe:`, error);
            setFeedbackMessage({ type: 'error', text: error.message || `Failed to ${method === 'POST' ? 'save' : 'update'} recipe.` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRecipe = async () => {
        clearFeedback();
        if (!currentRecipeId) {
            setFeedbackMessage({ type: 'error', text: 'No recipe selected to delete.' }); return;
        }
        if (!window.confirm(`Are you sure you want to delete the recipe "${recipeName}"?`)) return;

        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/recipes/${currentRecipeId}`, {
                method: 'DELETE', headers: AuthService.getAuthHeader(),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `HTTP error! status: ${response.status}`);
            setFeedbackMessage({ type: 'success', text: result.message || 'Recipe deleted successfully.'});
            handleClearForm();
            await fetchUserRecipes();
        } catch (error) {
            console.error(`RecipeCalculator: Error deleting recipe:`, error);
            setFeedbackMessage({ type: 'error', text: error.message || 'Failed to delete recipe.'});
        } finally {
            setIsSaving(false);
        }
    };

    const handleStepChange = (index, field, value) => {
        setRecipeSteps(prevSteps =>
            prevSteps.map((step, i) => {
                if (i === index) {
                    const newStep = { ...step, [field]: value };

                    if (field === 'step_id') {
                        const predefined = predefinedSteps.find(ps => ps.step_id === Number(value));
                        newStep.step_name = predefined ? predefined.step_name : 'Custom Step';

                        // Reset conditional fields based on new step type
                        newStep.contribution_pct = null;
                        newStep.target_hydration = null;
                        newStep.stretch_fold_interval_minutes = null;
                        newStep.duration_override = predefined?.defaultDurationMinutes ?? null; // Set default duration from predefined

                        if (Number(value) === LEVAIN_BUILD_STEP_ID_DYNAMIC) {
                            newStep.contribution_pct = DEFAULT_LEVAIN_STEP_TEMPLATE.contribution_pct;
                            newStep.target_hydration = DEFAULT_LEVAIN_STEP_TEMPLATE.target_hydration;
                            // Levain duration is often variable, so null or user-set is fine.
                            // If DEFAULT_LEVAIN_STEP_TEMPLATE had a duration, you could use it here.
                        } else if (Number(value) === BULK_FERMENT_S_AND_F_STEP_ID_DYNAMIC) {
                            newStep.stretch_fold_interval_minutes = 30; // Default S&F interval
                            // duration_override (total bulk time) would come from predefinedSteps.defaultDurationMinutes or be user-set
                        }
                    }
                    return newStep;
                }
                return step;
            })
        );
    };


    const handleAddStep = () => {
        setRecipeSteps(prevSteps => {
            const maxOrder = prevSteps.reduce((max, step) => Math.max(max, step.step_order || 0), 0);
            
            let defaultNewStepType = null;
            let defaultDuration = null;
            let defaultSFInterval = null;
            let defaultContributionPct = null;
            let defaultTargetHydration = null;

            if (predefinedSteps.length > 0) {
                defaultNewStepType = predefinedSteps[0]; // Default to the first predefined step
                defaultDuration = defaultNewStepType.defaultDurationMinutes ?? null;

                if (defaultNewStepType.step_id === BULK_FERMENT_S_AND_F_STEP_ID_DYNAMIC) {
                    defaultSFInterval = 30; // default S&F interval
                } else if (defaultNewStepType.step_id === LEVAIN_BUILD_STEP_ID_DYNAMIC) {
                    defaultContributionPct = DEFAULT_LEVAIN_STEP_TEMPLATE.contribution_pct;
                    defaultTargetHydration = DEFAULT_LEVAIN_STEP_TEMPLATE.target_hydration;
                    // Default duration for levain might be null or a specific value if defined
                    defaultDuration = DEFAULT_LEVAIN_STEP_TEMPLATE.duration_override ?? defaultNewStepType.defaultDurationMinutes;
                }
            }
            
            const newStep = {
                temp_client_id: Date.now() + Math.random(), // Unique temporary ID for DND key
                step_id: defaultNewStepType ? defaultNewStepType.step_id : null,
                step_name: defaultNewStepType ? defaultNewStepType.step_name : 'New Step',
                step_order: maxOrder + 1,
                duration_override: defaultDuration,
                notes: '',
                target_temperature_celsius: null,
                contribution_pct: defaultContributionPct,
                target_hydration: defaultTargetHydration,
                stretch_fold_interval_minutes: defaultSFInterval,
            };
            return [...prevSteps, newStep];
        });
    };


    const handleDeleteStep = (indexToDelete) => {
        const updatedSteps = recipeSteps.filter((_, index) => index !== indexToDelete)
            .map((step, index) => ({ ...step, step_order: index + 1 }));
        setRecipeSteps(updatedSteps);
    };

    function handleDragEnd(event) {
        const {active, over} = event;
        if (active.id !== over.id && over) { // Make sure 'over' is not null
            setRecipeSteps((items) => {
                const oldIndex = items.findIndex(item => getStepDnDId(item) === active.id);
                const newIndex = items.findIndex(item => getStepDnDId(item) === over.id);
                
                if (oldIndex === -1 || newIndex === -1) return items; // Should not happen if IDs are correct

                const movedItems = arrayMove(items, oldIndex, newIndex);
                // Re-assign step_order based on new visual order
                return movedItems.map((item, index) => ({ ...item, step_order: index + 1 }));
            });
        }
    }


    return (
        <div className="recipe-calculator-layout"> {/* Overall layout container */}
            <div className="recipe-details-column"> {/* Left Column */}
                <h2>Sourdough Recipe Calculator</h2>
                {feedbackMessage.text && (
                    <p style={{ color: feedbackMessage.type === 'error' ? 'red' : 'green', textAlign: 'center', marginBottom: '15px' }}>
                        {feedbackMessage.text}
                    </p>
                )}

                <div className="recipe-management-group">
                    <h3>Manage Recipes</h3>
                    {AuthService.isLoggedIn() && (
                        <div className="input-group">
                            <label htmlFor="loadRecipeSelect">Load Recipe:</label>
                            <select id="loadRecipeSelect" value={selectedRecipeToLoad} onChange={handleLoadRecipe} disabled={isLoadingRecipes || isSaving}>
                                <option value="">Select a recipe...</option>
                                {savedRecipes.map(recipe => (
                                    <option key={recipe.recipe_id} value={recipe.recipe_id}>
                                        {recipe.recipe_name}
                                    </option>
                                ))}
                            </select>
                            {isLoadingRecipes && <p>Loading recipes...</p>}
                            {savedRecipes.length === 0 && !isLoadingRecipes && (
                                <p>No saved recipes. Fill out the form and save!</p>
                            )}
                        </div>
                    )}
                    {!AuthService.isLoggedIn() && (
                        <p>Please login to save and load your recipes.</p>
                    )}
                </div>

                <hr />

                <div className="input-group">
                    <label htmlFor="recipeName">Recipe Name:</label>
                    <input type="text" id="recipeName" value={recipeName} onChange={(e) => {setRecipeName(e.target.value); clearFeedback();}} disabled={isSaving} />
                </div>
                <div className="input-group">
                    <label htmlFor="description">Description (Optional):</label>
                    <textarea id="description" value={description} onChange={(e) => {setDescription(e.target.value); clearFeedback();}} disabled={isSaving} />
                </div>
                <div className="input-group two-column">
                    <label htmlFor="targetDoughWeight">Target Dough Weight (g):</label>
                    <input type="number" id="targetDoughWeight" value={targetDoughWeight} onChange={(e) => {setTargetDoughWeight(e.target.value); clearFeedback();}} disabled={isSaving}/>
                </div>
                <div className="input-group two-column">
                    <label htmlFor="hydrationPercentage">Overall Hydration (%):</label>
                    <input type="number" id="hydrationPercentage" value={hydrationPercentage} onChange={(e) => {setHydrationPercentage(e.target.value); clearFeedback();}} disabled={isSaving}/>
                </div>
                <div className="input-group two-column">
                    <label htmlFor="saltPercentage">Salt (% of total flour):</label>
                    <input type="number" id="saltPercentage" value={saltPercentage} onChange={(e) => {setSaltPercentage(e.target.value); clearFeedback();}} disabled={isSaving}/>
                </div>

                 {AuthService.isLoggedIn() && (
                    <div className="actions-group main-actions">
                        <button onClick={handleSaveOrUpdateRecipe} disabled={isSaving}>
                            {isSaving ? 'Saving...' : (currentRecipeId ? 'Update Loaded Recipe' : 'Save as New Recipe')}
                        </button>
                        {currentRecipeId && (
                            <button onClick={handleDeleteRecipe} disabled={isSaving} style={{marginLeft: '10px', backgroundColor: '#dc3545'}}>
                                {isSaving ? 'Deleting...' : 'Delete Loaded Recipe'}
                            </button>
                        )}
                        <button type="button" onClick={handleClearForm} style={{marginLeft: '10px', backgroundColor: '#6c757d'}} disabled={isSaving}>
                            Clear Form / New
                        </button>
                    </div>
                )}

                <div className="results-group">
                    <h3>Recipe Calculation:</h3>
                    <div className="result-item"><span>Flour (added):</span> <span>{results.flourWeight} g</span></div>
                    <div className="result-item"><span>Water (added):</span> <span>{results.waterWeight} g</span></div>
                    <div className="result-item"><span>Starter:</span> <span>{results.starterWeight} g</span></div>
                    <div className="result-item"><span>Salt:</span> <span>{results.saltWeight} g</span></div>
                    <div className="result-item total">
                        <strong>Total:</strong>
                        <strong>{results.totalWeight} g</strong>
                    </div>
                </div>
            </div>

            <div className="steps-column"> {/* Right Column */}
                <h3>Recipe Steps</h3>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={recipeSteps.map(s => getStepDnDId(s))} strategy={verticalListSortingStrategy}>
                        <div className="steps-management-section">
                            {isLoadingPredefinedSteps && <p>Loading step types...</p>}
                            {recipeSteps.map((step, index) => {
                                const uniqueId = getStepDnDId(step);
                                const isBulkFermentSFStep = step.step_id === BULK_FERMENT_S_AND_F_STEP_ID_DYNAMIC;
                                const isLevainStep = step.step_id === LEVAIN_BUILD_STEP_ID_DYNAMIC;

                                return (
                                    <SortableStepItem key={uniqueId} id={uniqueId}>
                                        <div className="step-item-editor"> {/* Removed inline styles, manage in CSS */}
                                            <div className="step-header">
                                                <h4>
                                                    Step {step.step_order || index + 1}:
                                                    <select
                                                        value={step.step_id || ''}
                                                        onChange={(e) => handleStepChange(index, 'step_id', e.target.value ? parseInt(e.target.value) : null)}
                                                        disabled={isLoadingPredefinedSteps || isSaving}
                                                        style={{marginLeft: '10px'}}
                                                    >
                                                        <option value="">-- Select Step Type --</option>
                                                        {predefinedSteps.map(ps => (
                                                            <option key={ps.step_id} value={ps.step_id}>{ps.step_name}</option>
                                                        ))}
                                                    </select>
                                                </h4>
                                                <button type="button" className="remove-step-btn" onClick={() => handleDeleteStep(index)}  disabled={isSaving}>Remove</button>
                                            </div>
                                            {/* Order input removed as per previous request, step_order managed by DND */}

                                            {isBulkFermentSFStep ? (
                                                <>
                                                    <div className="input-group two-column">
                                                        <label htmlFor={`step-total-bulk-time-${index}`}>Total Bulk Time (mins):</label>
                                                        <input type="number" id={`step-total-bulk-time-${index}`} placeholder="e.g., 240" value={step.duration_override || ''} onChange={e => handleStepChange(index, 'duration_override', e.target.value === '' ? null : parseInt(e.target.value))} disabled={isSaving} />
                                                    </div>
                                                    <div className="input-group two-column">
                                                        <label htmlFor={`step-sf-interval-${index}`}>S&F Interval (mins):</label>
                                                        <input type="number" id={`step-sf-interval-${index}`} placeholder="e.g., 30" value={step.stretch_fold_interval_minutes || ''} onChange={e => handleStepChange(index, 'stretch_fold_interval_minutes', e.target.value === '' ? null : parseInt(e.target.value))} disabled={isSaving}/>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="input-group two-column">
                                                    <label htmlFor={`step-duration-${index}`}>Duration (mins): </label>
                                                    <input type="number" id={`step-duration-${index}`} placeholder="e.g., 60" value={step.duration_override || ''} onChange={e => handleStepChange(index, 'duration_override', e.target.value === '' ? null : parseInt(e.target.value))} disabled={isSaving} />
                                                </div>
                                            )}

                                            <div className="input-group two-column">
                                                <label htmlFor={`step-temp-${index}`}>Temp (°C): </label>
                                                <input type="number" id={`step-temp-${index}`} placeholder="e.g., 24" value={step.target_temperature_celsius || ''} onChange={e => handleStepChange(index, 'target_temperature_celsius', e.target.value === '' ? null : parseFloat(e.target.value))} disabled={isSaving} />
                                            </div>

                                            {isLevainStep && (
                                                <>
                                                    <div className="input-group two-column">
                                                        <label htmlFor={`step-levain-contrib-${index}`}>Levain Contribution (%): </label>
                                                        <input type="number" id={`step-levain-contrib-${index}`} placeholder="e.g., 20" value={step.contribution_pct || ''} onChange={e => handleStepChange(index, 'contribution_pct', e.target.value === '' ? null : parseFloat(e.target.value))} disabled={isSaving}/>
                                                    </div>
                                                    <div className="input-group two-column">
                                                        <label htmlFor={`step-levain-hydra-${index}`}>Levain Hydration (%): </label>
                                                        <input type="number" id={`step-levain-hydra-${index}`} placeholder="e.g., 100" value={step.target_hydration || ''} onChange={e => handleStepChange(index, 'target_hydration', e.target.value === '' ? null : parseFloat(e.target.value))} disabled={isSaving}/>
                                                    </div>
                                                </>
                                            )}
                                            <div className="input-group">
                                                <label htmlFor={`step-notes-${index}`}>Notes: </label>
                                                <textarea id={`step-notes-${index}`} value={step.notes || ''} onChange={e => handleStepChange(index, 'notes', e.target.value)} disabled={isSaving} />
                                            </div>
                                        </div>
                                    </SortableStepItem>
                                );
                            })}
                             <button type="button" onClick={handleAddStep} disabled={isLoadingPredefinedSteps || predefinedSteps.length === 0 || isSaving} style={{marginTop: '10px'}}>
                                {isLoadingPredefinedSteps ? 'Loading types...' : (predefinedSteps.length === 0 && !isLoadingPredefinedSteps ? 'No Step Types Loaded' : 'Add Step')}
                            </button>
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}

export default RecipeCalculator;