// src/services/RecipeService.js
import AuthService from './AuthService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

const RecipeService = {
    async getPredefinedSteps() {
        const authHeader = AuthService.getAuthHeader(); // Steps are likely user-specific or require login
        const response = await fetch(`${API_BASE_URL}/api/recipes/steps`, { // UPDATED URL
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
        // This logic assumes base recipes (templates) can also be fetched via this endpoint if not user-owned.
        // The backend controller for getRecipeById handles checking user ownership or if it's a base recipe.
        // Authentication is still sent, as user-specific recipes are protected.
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
        // Base templates are usually public, so no auth header is sent.
        // If your API requires auth for templates, add: headers: AuthService.getAuthHeader()
        const response = await fetch(`${API_BASE_URL}/api/recipes/templates`); // UPDATED URL

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
        const result = await response.json(); // Attempt to parse JSON, even for errors, as your backend might send JSON error messages
        if (!response.ok) throw new Error(result.message || `HTTP error deleting recipe ${recipeId}! status: ${response.status}`);
        return result; // Contains success message from backend
    }
};

export default RecipeService;