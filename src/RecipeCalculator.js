// src/RecipeCalculator.js
import React, { useState, useEffect, useCallback } from 'react';
import './RecipeCalculator.css'; 
import AuthService from './services/AuthService';

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

// This should ideally be dynamically found from predefinedSteps once loaded
let LEVAIN_BUILD_STEP_ID_DYNAMIC = null; 

const DEFAULT_LEVAIN_STEP_TEMPLATE = { // Used as a template
    step_id: null, // Will be set from predefinedSteps
    step_name: 'Levain Build', 
    step_order: 1,
    duration_override: null, 
    notes: '',
    target_temperature_celsius: null,
    contribution_pct: 20,    
    target_hydration: 100    
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

    const levainStep = steps.find(step => step.step_id === LEVAIN_BUILD_STEP_ID_DYNAMIC && step.contribution_pct != null && step.target_hydration != null);
    
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

    const clearFeedback = useCallback(() => setFeedbackMessage({ type: '', text: '' }), []);

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
            const levainStepFromAPI = data.find(s => s.step_name === 'Levain Build');
            if (levainStepFromAPI) {
                LEVAIN_BUILD_STEP_ID_DYNAMIC = levainStepFromAPI.step_id;
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
        
        const processedSteps = (recipeData.steps || []).map(step => {
            const predefined = predefinedSteps.find(ps => ps.step_id === step.step_id);
            return {
                ...step,
                step_name: step.step_name || (predefined ? predefined.step_name : `Unknown Step ID ${step.step_id}`),
                duration_override: step.duration_override != null ? Number(step.duration_override) : null,
                target_temperature_celsius: step.target_temperature_celsius != null ? Number(step.target_temperature_celsius) : null,
                contribution_pct: step.contribution_pct != null ? Number(step.contribution_pct) : null,
                target_hydration: step.target_hydration != null ? Number(step.target_hydration) : null,
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
        const levainTemplate = predefinedSteps.find(ps => ps.step_name === 'Levain Build');
        if (levainTemplate) {
            LEVAIN_BUILD_STEP_ID_DYNAMIC = levainTemplate.step_id; // Ensure this is set
            initialSteps = [{
                ...DEFAULT_LEVAIN_STEP_TEMPLATE,
                step_id: levainTemplate.step_id,
                step_name: levainTemplate.step_name,
            }];
        }
        setRecipeSteps(initialSteps);
        clearFeedback();
    }, [clearFeedback, predefinedSteps]);

    const fetchUserRecipes = useCallback(async () => {
        if (!AuthService.isLoggedIn()) {
            setSavedRecipes([]);
             handleClearForm(); // Clear form if user logs out
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
                 handleClearForm(); // Also ensure form is reset if no recipes
            }
        } catch (error) {
            console.error("RecipeCalculator: Error fetching user recipes:", error);
            setFeedbackMessage({ type: 'error', text: `Failed to load recipes: ${error.message}` });
            setSavedRecipes([]);
             handleClearForm(); // Clear form on error
        } finally {
            setIsLoadingRecipes(false);
        }
    }, [clearFeedback, handleClearForm]);

    useEffect(() => {
        if (AuthService.isLoggedIn()) {
            fetchUserRecipes();
        } else {
            handleClearForm();
        }
    }, [AuthService.isLoggedIn(), fetchUserRecipes, handleClearForm]);


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
        setSelectedRecipeToLoad(recipeIdToLoad); // Set this immediately so dropdown reflects selection

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
        if (!currentRecipeId && AuthService.isLoggedIn() && predefinedSteps.length > 0) {
             handleClearForm();
        }
    }, [currentRecipeId, predefinedSteps, handleClearForm]);


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
        // Validate steps
        for (const step of recipeSteps) {
            if (step.step_id == null || step.step_order == null) {
                 setFeedbackMessage({ type: 'error', text: `Each step must have a type and order.`});
                 return;
            }
            if (step.step_id === LEVAIN_BUILD_STEP_ID_DYNAMIC && (step.contribution_pct == null || step.target_hydration == null)) {
                setFeedbackMessage({ type: 'error', text: `Levain Build step requires Contribution % and Starter Hydration %.`});
                return;
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
                step_order: Number(step.step_order),
                duration_override: step.duration_override != null ? Number(step.duration_override) : null,
                notes: step.notes || null,
                target_temperature_celsius: step.target_temperature_celsius != null ? Number(step.target_temperature_celsius) : null,
                contribution_pct: step.contribution_pct != null ? Number(step.contribution_pct) : null,
                target_hydration: step.target_hydration != null ? Number(step.target_hydration) : null,
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
            
            await fetchUserRecipes();
            
            const recipeIdToLoad = method === 'POST' ? (result.recipe && result.recipe.recipe_id) : currentRecipeId;
            if (recipeIdToLoad) {
                const freshRecipeData = await (await fetch(`${API_BASE_URL}/api/recipes/${recipeIdToLoad}`, { headers: AuthService.getAuthHeader() })).json();
                setFormStateFromRecipe(freshRecipeData);
            } else if (method === 'POST') { // New recipe, but ID not in result for some reason
                handleClearForm(); // Fallback to clear form
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
        const updatedSteps = recipeSteps.map((step, i) => {
            if (i === index) {
                const newStep = { ...step, [field]: value };
                // If step_id changes, update step_name and reset conditional fields
                if (field === 'step_id') {
                    const predefined = predefinedSteps.find(ps => ps.step_id === Number(value));
                    newStep.step_name = predefined ? predefined.step_name : 'Custom Step';
                    if (Number(value) !== LEVAIN_BUILD_STEP_ID_DYNAMIC) {
                        newStep.contribution_pct = null;
                        newStep.target_hydration = null;
                    } else { // It's a levain step
                        newStep.contribution_pct = newStep.contribution_pct ?? DEFAULT_LEVAIN_STEP_TEMPLATE.contribution_pct;
                        newStep.target_hydration = newStep.target_hydration ?? DEFAULT_LEVAIN_STEP_TEMPLATE.target_hydration;
                    }
                }
                return newStep;
            }
            return step;
        });

        // Re-sort by step_order if it was the field changed or if just adding/removing
        // This ensures step_order remains sequential visually if user changes it
        if (field === 'step_order') {
             updatedSteps.sort((a, b) => (a.step_order || 0) - (b.step_order || 0));
        }
        setRecipeSteps(updatedSteps);
    };

    const handleAddStep = () => {
        const maxOrder = recipeSteps.reduce((max, step) => Math.max(max, step.step_order || 0), 0);
        const defaultNewStep = predefinedSteps.length > 0 
            ? { ...predefinedSteps[0], step_name: predefinedSteps[0].step_name || 'New Step' } // Use name from predefined
            : { step_id: null, step_name: 'New Step' };

        const newStep = {
            ...defaultNewStep,
            step_order: maxOrder + 1,
            duration_override: null,
            notes: '',
            target_temperature_celsius: null,
            contribution_pct: null,
            target_hydration: null,
            // Add a temporary client-side ID for keying if items could be added/deleted rapidly
            // temp_client_id: Date.now() 
        };
        setRecipeSteps([...recipeSteps, newStep]);
    };

    const handleDeleteStep = (indexToDelete) => {
        const updatedSteps = recipeSteps.filter((_, index) => index !== indexToDelete)
            .map((step, index) => ({ ...step, step_order: index + 1 })); // Re-sequence order
        setRecipeSteps(updatedSteps);
    };
    
    return (
        <div className="recipe-calculator">
            <h2>Sourdough Recipe Calculator</h2>
            {feedbackMessage.text && (
                <p style={{ color: feedbackMessage.type === 'error' ? 'red' : 'green' }}>
                    {feedbackMessage.text}
                </p>
            )}

            <div className="recipe-management-group">
                 <h3>Manage Recipes</h3>
                {AuthService.isLoggedIn() && (
                    <div className="input-group">
                        <label htmlFor="loadRecipeSelect">Load Recipe:</label>
                        <select id="loadRecipeSelect" value={selectedRecipeToLoad} onChange={handleLoadRecipe} disabled={isLoadingRecipes}>
                            <option value="">Select a recipe...</option>
                            {savedRecipes.map(recipe => (
                                <option key={recipe.recipe_id} value={recipe.recipe_id}>
                                    {recipe.recipe_name}
                                </option>
                            ))}
                        </select>
                        {isLoadingRecipes && <p>Loading recipes...</p>}
                         {savedRecipes.length === 0 && !isLoadingRecipes && (
                            <p>No saved recipes. Fill out the form and save your first recipe!</p>
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
                <input type="text" id="recipeName" value={recipeName} onChange={(e) => {setRecipeName(e.target.value); clearFeedback();}} />
            </div>
             <div className="input-group">
                <label htmlFor="description">Description (Optional):</label>
                <textarea id="description" value={description} onChange={(e) => {setDescription(e.target.value); clearFeedback();}} />
            </div>
            <div className="input-group two-column">
                <label htmlFor="targetDoughWeight">Target Dough Weight (g):</label>
                <input type="number" id="targetDoughWeight" value={targetDoughWeight} onChange={(e) => {setTargetDoughWeight(e.target.value); clearFeedback();}} />
            </div>
            <div className="input-group two-column">
                <label htmlFor="hydrationPercentage">Overall Hydration (%):</label>
                <input type="number" id="hydrationPercentage" value={hydrationPercentage} onChange={(e) => {setHydrationPercentage(e.target.value); clearFeedback();}} />
            </div>
            <div className="input-group two-column">
                <label htmlFor="saltPercentage">Salt (% of total flour):</label>
                <input type="number" id="saltPercentage" value={saltPercentage} onChange={(e) => {setSaltPercentage(e.target.value); clearFeedback();}} />
            </div>
            
            <hr />
            <h3>Recipe Steps</h3>
            <div className="steps-management-section">
                {isLoadingPredefinedSteps && <p>Loading step types...</p>}
                {recipeSteps.map((step, index) => (
                    <div key={index /* Or step.temp_client_id if you add one */} className="step-item-editor" style={{border: '1px solid #ddd', padding: '15px', marginBottom: '15px', borderRadius: '4px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <h4>
                                Step {step.step_order || index + 1}: 
                                <select 
                                    value={step.step_id || ''} 
                                    onChange={(e) => handleStepChange(index, 'step_id', e.target.value ? parseInt(e.target.value) : null)}
                                    disabled={isLoadingPredefinedSteps}
                                    style={{marginLeft: '10px'}}
                                >
                                    <option value="">-- Select Step Type --</option>
                                    {predefinedSteps.map(ps => (
                                        <option key={ps.step_id} value={ps.step_id}>{ps.step_name}</option>
                                    ))}
                                </select>
                            </h4>
                            <button type="button" onClick={() => handleDeleteStep(index)} style={{color: 'red'}}>Remove</button>
                        </div>
                         <div className="input-group two-column">
                            <label>Order: </label>
                            <input type="number" min="1" value={step.step_order || ''} onChange={e => handleStepChange(index, 'step_order', e.target.value ? parseInt(e.target.value) : (recipeSteps.length + 1) )} />
                        </div>
                        <div className="input-group two-column">
                            <label>Duration (mins): </label>
                            <input type="number" placeholder="e.g., 60" value={step.duration_override || ''} onChange={e => handleStepChange(index, 'duration_override', e.target.value === '' ? null : parseInt(e.target.value))} />
                        </div>
                        <div className="input-group two-column">
                            <label>Temp (°C): </label>
                            <input type="number" placeholder="e.g., 24" value={step.target_temperature_celsius || ''} onChange={e => handleStepChange(index, 'target_temperature_celsius', e.target.value === '' ? null : parseFloat(e.target.value))} />
                        </div>
                        
                        {step.step_id === LEVAIN_BUILD_STEP_ID_DYNAMIC && (
                            <>
                                <div className="input-group two-column">
                                    <label>Levain Contribution (% of TDW): </label>
                                    <input type="number" placeholder="e.g., 20" value={step.contribution_pct || ''} onChange={e => handleStepChange(index, 'contribution_pct', e.target.value === '' ? null : parseFloat(e.target.value))} />
                                </div>
                                <div className="input-group two-column">
                                    <label>Levain Hydration (%): </label>
                                    <input type="number" placeholder="e.g., 100" value={step.target_hydration || ''} onChange={e => handleStepChange(index, 'target_hydration', e.target.value === '' ? null : parseFloat(e.target.value))} />
                                </div>
                            </>
                        )}
                        <div className="input-group">
                            <label>Notes for this step: </label>
                            <textarea style={{width: 'calc(100% - 22px)'}} value={step.notes || ''} onChange={e => handleStepChange(index, 'notes', e.target.value)} />
                        </div>
                    </div>
                ))}
                <button type="button" onClick={handleAddStep} disabled={isLoadingPredefinedSteps || predefinedSteps.length === 0}>
                    {isLoadingPredefinedSteps ? 'Loading types...' : (predefinedSteps.length === 0 && !isLoadingPredefinedSteps ? 'No Step Types Loaded' : 'Add Step')}
                </button>
            </div>
            <hr style={{marginTop: '20px'}}/>


            {AuthService.isLoggedIn() && (
                <div className="actions-group">
                    <button onClick={handleSaveOrUpdateRecipe} disabled={isSaving}>
                        {isSaving ? 'Saving...' : (currentRecipeId ? 'Update Loaded Recipe' : 'Save as New Recipe')}
                    </button>
                    {currentRecipeId && (
                        <button onClick={handleDeleteRecipe} disabled={isSaving} style={{marginLeft: '10px', backgroundColor: '#dc3545'}}>
                            {isSaving ? 'Deleting...' : 'Delete Loaded Recipe'}
                        </button>
                    )}
                     <button type="button" onClick={handleClearForm} style={{marginLeft: '10px', backgroundColor: '#6c757d'}}>
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
    );
}

export default RecipeCalculator;