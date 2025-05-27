// src/RecipeCalculator.js
import React, { useState, useEffect, useCallback } from 'react';
import './RecipeCalculator.css'; // Assuming you have this CSS file
import AuthService from './services/AuthService'; // Import AuthService

// API_BASE_URL should be consistent with how you've defined it elsewhere (e.g., in AuthService or LoginPage)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

const INITIAL_INPUTS = {
    targetDoughWeight: '1000', // Or your preferred defaults
    hydrationPercentage: '70',
    starterPercentage: '20',
    starterHydration: '100',
    saltPercentage: '2',
    recipeName: 'My New Sourdough', // Default for a new, unsaved recipe
    description: '',
};

// calculateRecipe function (assuming it's defined outside or imported, and remains the same)
// function calculateRecipe(...) { ... }
// For brevity, I'll assume calculateRecipe is available as it was before.
// Make sure it's correctly defined or imported in your actual file.
function calculateRecipe(
    targetDoughWeight,
    hydrationPercentage,
    starterPercentage,
    starterHydration,
    saltPercentage
) {
    if (targetDoughWeight <= 0 || hydrationPercentage < 0 || starterPercentage < 0 || starterHydration < 0 || saltPercentage < 0) {
        if (targetDoughWeight <= 0) {
            return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0 };
        }
    }
    const targetDoughWeightDouble = parseFloat(targetDoughWeight);
    const hydrationPercentageDouble = parseFloat(hydrationPercentage) / 100.0;
    const starterPercentageDouble = parseFloat(starterPercentage) / 100.0;
    const starterHydrationDouble = parseFloat(starterHydration) / 100.0;
    const saltPercentageDouble = parseFloat(saltPercentage) / 100.0;
    if (isNaN(hydrationPercentageDouble) || isNaN(starterPercentageDouble) || isNaN(starterHydrationDouble) || isNaN(saltPercentageDouble)) {
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0 };
    }
    if (1 + hydrationPercentageDouble === 0) {
         return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0 };
    }
    const totalWeightWithoutSalt =
        targetDoughWeightDouble / (1 + saltPercentageDouble * (1 / (1 + hydrationPercentageDouble)));
    let totalFlourWeight = totalWeightWithoutSalt / (1 + hydrationPercentageDouble);
    if (isNaN(totalFlourWeight) || !isFinite(totalFlourWeight)) totalFlourWeight = 0;
     if (1 + starterHydrationDouble === 0) {
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0 };
    }
    const flourFromStarter =
        (totalFlourWeight * starterPercentageDouble) / (1 + starterHydrationDouble);
    const waterFromStarter = flourFromStarter * starterHydrationDouble;
    const finalFlourWeight = totalFlourWeight - flourFromStarter;
    const totalWaterWeight = totalWeightWithoutSalt - totalFlourWeight;
    const finalWaterWeight = totalWaterWeight - waterFromStarter;
    const finalStarterWeight = flourFromStarter + waterFromStarter;
    const saltWeight = totalFlourWeight * saltPercentageDouble;
    const round = (num) => {
        if (isNaN(num) || !isFinite(num)) return 0;
        return Math.round(num * 10) / 10;
    }
    return {
        flourWeight: round(finalFlourWeight),
        waterWeight: round(finalWaterWeight),
        starterWeight: round(finalStarterWeight),
        saltWeight: round(saltWeight)
    };
}


function RecipeCalculator() {
    // Input states
    const [targetDoughWeight, setTargetDoughWeight] = useState(INITIAL_INPUTS.targetDoughWeight);
    const [hydrationPercentage, setHydrationPercentage] = useState(INITIAL_INPUTS.hydrationPercentage);
    const [starterPercentage, setStarterPercentage] = useState(INITIAL_INPUTS.starterPercentage);
    const [starterHydration, setStarterHydration] = useState(INITIAL_INPUTS.starterHydration);
    const [saltPercentage, setSaltPercentage] = useState(INITIAL_INPUTS.saltPercentage);
    const [recipeName, setRecipeName] = useState(INITIAL_INPUTS.recipeName);
    const [description, setDescription] = useState(INITIAL_INPUTS.description);
    const [currentRecipeId, setCurrentRecipeId] = useState(null); // To store the ID of the loaded/editing recipe

    // Output states
    const [results, setResults] = useState({ flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0 });
    
    // UI/UX states
    const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // For save/update operations
    const [savedRecipes, setSavedRecipes] = useState([]);
    const [selectedRecipeToLoad, setSelectedRecipeToLoad] = useState(''); // For the dropdown
    const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' }); // For user feedback

    const clearFeedback = () => setFeedbackMessage({ type: '', text: '' });

    // Function to populate all input form fields
    const setAllInputs = useCallback((data) => {
        setTargetDoughWeight(String(data.targetDoughWeight || INITIAL_INPUTS.targetDoughWeight));
        setHydrationPercentage(String(data.hydrationPercentage || INITIAL_INPUTS.hydrationPercentage));
        setStarterPercentage(String(data.starterPercentage || INITIAL_INPUTS.starterPercentage));
        setStarterHydration(String(data.starterHydration || INITIAL_INPUTS.starterHydration));
        setSaltPercentage(String(data.saltPercentage || INITIAL_INPUTS.saltPercentage));
        setRecipeName(String(data.recipe_name || INITIAL_INPUTS.recipeName));
        setDescription(String(data.description || INITIAL_INPUTS.description));
        setCurrentRecipeId(data.recipe_id || null);
        setSelectedRecipeToLoad(data.recipe_id || ''); // Sync dropdown
    }, []); // INITIAL_INPUTS is stable

    // Fetch the list of saved recipes for the authenticated user on component mount
    const fetchUserRecipes = useCallback(async () => {
        if (!AuthService.isLoggedIn()) {
            console.log("RecipeCalculator: User not logged in, not fetching recipes.");
            setSavedRecipes([]); // Clear any existing recipes if user logs out
            return;
        }
        setIsLoadingRecipes(true);
        setFeedbackMessage({ type: '', text: ''});
        console.log("RecipeCalculator: Fetching user recipes...");
        try {
            const response = await fetch(`${API_BASE_URL}/api/recipes`, {
                method: 'GET',
                headers: AuthService.getAuthHeader(), // Get auth header from AuthService
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({})); // Try to get error message
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setSavedRecipes(data || []);
            if (data.length === 0) {
                setFeedbackMessage({ type: 'info', text: 'No saved recipes found. Create one below!' });
            }
            console.log("RecipeCalculator: Recipes fetched successfully", data);
        } catch (error) {
            console.error("RecipeCalculator: Error fetching user recipes:", error);
            setFeedbackMessage({ type: 'error', text: `Failed to load recipes: ${error.message}` });
            setSavedRecipes([]); // Clear recipes on error
        } finally {
            setIsLoadingRecipes(false);
        }
    }, []);

    useEffect(() => {
        fetchUserRecipes();
        // This effect should re-run if the user's login status changes.
        // We might need a way to trigger this from App.js if a user logs in/out
        // while this component is mounted, or rely on App.js unmounting/remounting this component.
        // For now, it runs on mount.
    }, [fetchUserRecipes]);


    // Recalculate results when inputs change
    useEffect(() => {
        const newResults = calculateRecipe(
            parseFloat(targetDoughWeight) || 0,
            parseFloat(hydrationPercentage) || 0,
            parseFloat(starterPercentage) || 0,
            parseFloat(starterHydration) || 0,
            parseFloat(saltPercentage) || 0
        );
        setResults(newResults);
    }, [targetDoughWeight, hydrationPercentage, starterPercentage, starterHydration, saltPercentage]);

    // Handler for loading a selected recipe from the dropdown
    const handleLoadRecipe = (event) => {
        clearFeedback();
        const recipeIdToLoad = event.target.value;
        setSelectedRecipeToLoad(recipeIdToLoad);

        if (!recipeIdToLoad) { // "Select a recipe" option
            setAllInputs(INITIAL_INPUTS); // Reset form to initial defaults
            return;
        }

        const recipeToLoad = savedRecipes.find(r => String(r.recipe_id) === String(recipeIdToLoad));
        if (recipeToLoad) {
            console.log("RecipeCalculator: Loading recipe into form:", recipeToLoad);
            setAllInputs(recipeToLoad); // Populate form with selected recipe's data
            // The backend GET /api/recipes should return all necessary fields including recipe_name,
            // targetDoughWeight, hydrationPercentage, saltPercentage, starterPercentage, starterHydration.
        }
    };

    // Placeholder for handleSaveOrUpdateRecipe - to be implemented next
    const handleSaveOrUpdateRecipe = async () => {
        clearFeedback();
        if (!recipeName.trim()) {
            setFeedbackMessage({ type: 'error', text: 'Recipe name is required.' });
            return;
        }
        setIsSaving(true);
        const recipeData = {
            recipe_name: recipeName.trim(),
            description: description.trim(),
            targetDoughWeight: parseFloat(targetDoughWeight),
            // target_weight_unit_id: 1, // Assuming grams, or make this selectable
            hydrationPercentage: parseFloat(hydrationPercentage),
            starterPercentage: parseFloat(starterPercentage),
            starterHydration: parseFloat(starterHydration),
            saltPercentage: parseFloat(saltPercentage),
        };

        let url = `${API_BASE_URL}/api/recipes`;
        let method = 'POST';

        if (currentRecipeId) { // If there's a currentRecipeId, we're updating
            url = `${API_BASE_URL}/api/recipes/${currentRecipeId}`;
            method = 'PUT';
            console.log(`RecipeCalculator: Updating recipe ID ${currentRecipeId} with data:`, recipeData);
        } else {
            console.log("RecipeCalculator: Saving new recipe with data:", recipeData);
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    ...AuthService.getAuthHeader(), // Add auth token
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(recipeData),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            setFeedbackMessage({ type: 'success', text: result.message || `Recipe ${method === 'POST' ? 'saved' : 'updated'} successfully!` });
            
            // After save/update, refresh the recipe list and potentially update the form
            await fetchUserRecipes(); // Refresh list
            if (method === 'POST' && result.recipe && result.recipe.recipe_id) {
                // If new recipe created, update currentRecipeId and selectedRecipeToLoad
                setCurrentRecipeId(result.recipe.recipe_id);
                setSelectedRecipeToLoad(result.recipe.recipe_id); // Select it in dropdown
            } else if (method === 'PUT' && result.recipe) {
                // If updated, ensure form reflects any backend-modified data (like updated_at)
                // For now, just re-asserting selected is usually fine as primary data came from form.
                 setSelectedRecipeToLoad(currentRecipeId);
            }


        } catch (error) {
            console.error(`RecipeCalculator: Error ${method === 'POST' ? 'saving' : 'updating'} recipe:`, error);
            setFeedbackMessage({ type: 'error', text: error.message || `Failed to ${method === 'POST' ? 'save' : 'update'} recipe.` });
        } finally {
            setIsSaving(false);
        }
    };
    
    // Placeholder for handleDeleteRecipe - to be implemented next
    const handleDeleteRecipe = async () => {
        clearFeedback();
        if (!currentRecipeId) {
            setFeedbackMessage({ type: 'error', text: 'No recipe selected to delete.' });
            return;
        }
        if (!window.confirm(`Are you sure you want to delete the recipe "${recipeName}"?`)) {
            return;
        }

        setIsSaving(true); // Or a specific isDeleting state
        console.log(`RecipeCalculator: Deleting recipe ID ${currentRecipeId}`);
        try {
            const response = await fetch(`${API_BASE_URL}/api/recipes/${currentRecipeId}`, {
                method: 'DELETE',
                headers: AuthService.getAuthHeader(),
            });
            const result = await response.json(); // Even for 204, try to parse, or check status first
            if (!response.ok) {
                 throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }
            setFeedbackMessage({ type: 'success', text: result.message || 'Recipe deleted successfully.'});
            setAllInputs(INITIAL_INPUTS); // Reset form
            await fetchUserRecipes(); // Refresh list
            setSelectedRecipeToLoad(''); // De-select
            setCurrentRecipeId(null);

        } catch (error) {
            console.error(`RecipeCalculator: Error deleting recipe:`, error);
            setFeedbackMessage({ type: 'error', text: error.message || 'Failed to delete recipe.'});
        } finally {
            setIsSaving(false);
        }
    };


    const totalCalculatedWeight = results.flourWeight + results.waterWeight + results.starterWeight + results.saltWeight;

    return (
        <div className="recipe-calculator">
            <h2>Sourdough Recipe Calculator</h2>
            {/* Feedback Message Display */}
            {feedbackMessage.text && (
                <p style={{ color: feedbackMessage.type === 'error' ? 'red' : 'green' }}>
                    {feedbackMessage.text}
                </p>
            )}

            {/* Recipe Management Section */}
            <div className="recipe-management-group">
                <h3>Manage Recipes</h3>
                {AuthService.isLoggedIn() && savedRecipes.length > 0 && (
                    <div className="input-group">
                        <label htmlFor="loadRecipeSelect">Load Recipe:</label>
                        <select id="loadRecipeSelect" value={selectedRecipeToLoad} onChange={handleLoadRecipe} disabled={isLoadingRecipes}>
                            <option value="">Select a recipe...</option>
                            {savedRecipes.map(recipe => (
                                <option key={recipe.recipe_id} value={recipe.recipe_id}>
                                    {recipe.recipe_name} (ID: {recipe.recipe_id})
                                </option>
                            ))}
                        </select>
                        {isLoadingRecipes && <p>Loading recipes...</p>}
                    </div>
                )}
                {AuthService.isLoggedIn() && savedRecipes.length === 0 && !isLoadingRecipes && (
                    <p>No saved recipes. Fill out the form and save your first recipe!</p>
                )}
                {!AuthService.isLoggedIn() && (
                    <p>Please login to save and load your recipes.</p>
                )}
            </div>
            
            <hr />

            {/* Calculator Inputs */}
            <div className="input-group">
                <label htmlFor="recipeName">Recipe Name:</label>
                <input type="text" id="recipeName" value={recipeName} onChange={(e) => {setRecipeName(e.target.value); clearFeedback();}} placeholder="e.g., Weekend Country Loaf" />
            </div>
             <div className="input-group">
                <label htmlFor="description">Description (Optional):</label>
                <textarea id="description" value={description} onChange={(e) => {setDescription(e.target.value); clearFeedback();}} placeholder="Notes about this recipe..." />
            </div>

            <div className="input-group two-column">
                <label htmlFor="targetDoughWeight">Target Dough Weight (g):</label>
                <input type="number" id="targetDoughWeight" value={targetDoughWeight} onChange={(e) => {setTargetDoughWeight(e.target.value); clearFeedback();}} />
            </div>
            <div className="input-group two-column">
                <label htmlFor="hydrationPercentage">Hydration (%):</label>
                <input type="number" id="hydrationPercentage" value={hydrationPercentage} onChange={(e) => {setHydrationPercentage(e.target.value); clearFeedback();}} />
            </div>
            <div className="input-group two-column">
                <label htmlFor="starterPercentage">Starter (% of flour):</label>
                <input type="number" id="starterPercentage" value={starterPercentage} onChange={(e) => {setStarterPercentage(e.target.value); clearFeedback();}} />
            </div>
            <div className="input-group two-column">
                <label htmlFor="starterHydration">Starter Hydration (%):</label>
                <input type="number" id="starterHydration" value={starterHydration} onChange={(e) => {setStarterHydration(e.target.value); clearFeedback();}} />
            </div>
            <div className="input-group two-column">
                <label htmlFor="saltPercentage">Salt (% of flour):</label>
                <input type="number" id="saltPercentage" value={saltPercentage} onChange={(e) => {setSaltPercentage(e.target.value); clearFeedback();}} />
            </div>

            {/* Action Buttons */}
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
                     <button onClick={() => { setAllInputs(INITIAL_INPUTS); clearFeedback(); }} style={{marginLeft: '10px', backgroundColor: '#6c757d'}}>
                        Clear Form / New
                    </button>
                </div>
            )}


            {/* Results Display */}
            <div className="results-group">
                <h3>Recipe Calculation:</h3>
                <div className="result-item"><span>Flour:</span> <span>{results.flourWeight} g</span></div>
                <div className="result-item"><span>Water:</span> <span>{results.waterWeight} g</span></div>
                <div className="result-item"><span>Starter:</span> <span>{results.starterWeight} g</span></div>
                <div className="result-item"><span>Salt:</span> <span>{results.saltWeight} g</span></div>
                <div className="result-item total">
                    <strong>Total:</strong>
                    <strong>{isNaN(totalCalculatedWeight) ? 0 : totalCalculatedWeight.toFixed(1)} g</strong>
                </div>
            </div>
        </div>
    );
}

export default RecipeCalculator;