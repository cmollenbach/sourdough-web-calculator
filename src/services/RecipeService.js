// src/services/RecipeService.js
import AuthService from './AuthService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

const RecipeService = {
    async getPredefinedSteps() {
        if (!AuthService.isLoggedIn()) throw new Error("User not logged in");
        const response = await fetch(`${API_BASE_URL}/api/steps`, {
            headers: AuthService.getAuthHeader(),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP error fetching step types! status: ${response.status}`);
        }
        return response.json();
    },

    async getUserRecipes() {
        if (!AuthService.isLoggedIn()) throw new Error("User not logged in");
        const response = await fetch(`${API_BASE_URL}/api/recipes`, {
            headers: AuthService.getAuthHeader(),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP error fetching user recipes! status: ${response.status}`);
        }
        return response.json();
    },

    async getRecipeById(recipeId) {
        if (!AuthService.isLoggedIn()) throw new Error("User not logged in");
        const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
            headers: AuthService.getAuthHeader(),
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

    async deleteRecipe(recipeId) {
        if (!AuthService.isLoggedIn()) throw new Error("User not logged in");
        const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
            method: 'DELETE',
            headers: AuthService.getAuthHeader(),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `HTTP error deleting recipe ${recipeId}! status: ${response.status}`);
        return result;
    }
};

export default RecipeService;