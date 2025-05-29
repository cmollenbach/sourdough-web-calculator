// src/services/RecipeService.js
import AuthService from './AuthService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

const RecipeService = {
    // ... (getPredefinedSteps, getUserRecipes, getRecipeById, saveRecipe, updateRecipe, getBaseRecipeTemplates, deleteRecipe) ...
    // Ensure all your existing methods are here

    async getPredefinedSteps() {
        const authHeader = AuthService.getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/api/recipes/steps`, {
            headers: authHeader,
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}. Failed to parse error JSON.` }));
            throw new Error(errData.message || `HTTP error fetching predefined step types! status: ${response.status}`);
        }
        return response.json();
    },

    async getUserRecipes() {
        const authHeader = AuthService.getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/api/recipes`, {
            headers: authHeader,
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}. Failed to parse error JSON.` }));
            throw new Error(errData.message || `HTTP error fetching user recipes! status: ${response.status}`);
        }
        return response.json();
    },

    async getRecipeById(recipeId) {
        const authHeader = AuthService.getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
            headers: authHeader,
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP error fetching recipe ${recipeId}! status: ${response.status}`);
        }
        return response.json();
    },

    async saveRecipe(recipeData) {
        if (!AuthService.isLoggedIn()) throw new Error("User not logged in");
        const response = await fetch(`${API_BASE_URL}/api/recipes`, {
            method: 'POST',
            headers: { ...AuthService.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify(recipeData),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `HTTP error saving recipe! status: ${response.status}`);
        return result;
    },

    async updateRecipe(recipeId, recipeData) {
        if (!AuthService.isLoggedIn()) throw new Error("User not logged in");
        const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
            method: 'PUT',
            headers: { ...AuthService.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify(recipeData),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `HTTP error updating recipe ${recipeId}! status: ${response.status}`);
        return result;
    },

    async getBaseRecipeTemplates() {
        const response = await fetch(`${API_BASE_URL}/api/recipes/templates`);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP error fetching base recipe templates! status: ${response.status}`);
        }
        return response.json();
    },

    async deleteRecipe(recipeId) {
        if (!AuthService.isLoggedIn()) throw new Error("User not logged in");
        const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
            method: 'DELETE',
            headers: AuthService.getAuthHeader(),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `HTTP error deleting recipe ${recipeId}! status: ${response.status}`);
        return result;
    },

    // --- GUIDED BAKING METHODS ---

    async startBake(recipeId) { // You already have this
        if (!AuthService.isLoggedIn()) throw new Error("User not logged in");
        const response = await fetch(`${API_BASE_URL}/api/bakes/start`, {
            method: 'POST',
            headers: { ...AuthService.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipeId }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || `HTTP error starting bake! status: ${response.status}`);
        }
        return result;
    },

    async completeStep(bakeLogId, currentBakeStepLogId, userNotes = '') {
        if (!AuthService.isLoggedIn()) throw new Error("User not logged in");
        const response = await fetch(`${API_BASE_URL}/api/bakes/${bakeLogId}/steps/complete`, {
            method: 'POST',
            headers: { ...AuthService.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentBakeStepLogId, userNotesForCompletedStep: userNotes }), // Match backend expectation
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || `HTTP error completing step! status: ${response.status}`);
        }
        return result;
    },

    async updateBakeStatus(bakeLogId, status) {
        if (!AuthService.isLoggedIn()) throw new Error("User not logged in");
        const response = await fetch(`${API_BASE_URL}/api/bakes/${bakeLogId}/status`, {
            method: 'PUT',
            headers: { ...AuthService.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || `HTTP error updating bake status! status: ${response.status}`);
        }
        return result; // Expected to return { newStatus, ... }
    },

    async getActiveBakes() {
        if (!AuthService.isLoggedIn()) throw new Error("User not logged in");
        const response = await fetch(`${API_BASE_URL}/api/bakes/active`, {
            headers: AuthService.getAuthHeader(),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}. Failed to parse error JSON.` }));
            throw new Error(errData.message || `HTTP error fetching active bakes! status: ${response.status}`);
        }
        return response.json(); // Expect { activeBakes: [...] }
    },

    async getBakeLogDetails(bakeLogId) {
        if (!AuthService.isLoggedIn()) throw new Error("User not logged in");
        const authHeader = AuthService.getAuthHeader();
        // Assuming your backend route is GET /api/bakes/:bakeLogId
        const response = await fetch(`${API_BASE_URL}/api/bakes/${bakeLogId}`, { 
             headers: authHeader,
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            // Assuming your backend sends back the full bake log details including current step
            // and recipe name etc. for this endpoint.
            throw new Error(errData.message || `HTTP error fetching bake log ${bakeLogId}! status: ${response.status}`);
        }
        return response.json();
    }
};

export default RecipeService;