// src/services/RecipeService.js
import AuthService from './AuthService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

const RecipeService = {
        async getPredefinedSteps() {
        // It's better if the calling code (e.g., DataContext) already ensures isLoggedIn is true
        // before calling this service method.
        // if (!AuthService.isLoggedIn()) throw new Error("User not logged in - checked in RecipeService");

        const token = AuthService.getToken();
        const authHeader = AuthService.getAuthHeader();

        console.log('[RecipeService.getPredefinedSteps] Token from AuthService.getToken():', token);
        console.log('[RecipeService.getPredefinedSteps] Auth Header being sent:', JSON.stringify(authHeader));

        const response = await fetch(`${API_BASE_URL}/api/steps`, {
            headers: authHeader, // Ensure this is AuthService.getAuthHeader() or your constructed header
        });

        console.log('[RecipeService.getPredefinedSteps] Response Status:', response.status);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}. Failed to parse error JSON.` }));
            console.error('[RecipeService.getPredefinedSteps] Error Data:', errData);
            throw new Error(errData.message || `HTTP error fetching step types! status: ${response.status}`);
        }
        return response.json();
    },

     async getUserRecipes() {
        const token = AuthService.getToken();
        const authHeader = AuthService.getAuthHeader();
        console.log('[RecipeService.getUserRecipes] Token from AuthService.getToken():', token);
        console.log('[RecipeService.getUserRecipes] Auth Header being sent:', JSON.stringify(authHeader));

        const response = await fetch(`${API_BASE_URL}/api/recipes`, {
            headers: authHeader,
        });
        console.log('[RecipeService.getUserRecipes] Response Status:', response.status);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}. Failed to parse error JSON.` }));
            console.error('[RecipeService.getUserRecipes] Error Data:', errData);
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
 async getBaseRecipeTemplates() {
     if (!AuthService.isLoggedIn()) throw new Error("User not logged in"); // Or allow public access
     const response = await fetch(`${API_BASE_URL}/api/templates`, { // Or your chosen endpoint
         headers: AuthService.getAuthHeader(),
     });
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
    }
};

export default RecipeService;