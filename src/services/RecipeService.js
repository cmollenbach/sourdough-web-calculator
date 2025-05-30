// src/services/RecipeService.js
import AuthService from './AuthService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

// Define custom error for authentication issues
export class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AuthError";
    this.status = status; // Store the HTTP status code
  }
}

const RecipeService = {
    async getPredefinedSteps() {
        const authHeader = AuthService.getAuthHeader();
        // Note: If this endpoint becomes authenticated and can return 401/403 for token issues,
        // the error handling below should be adjusted like other authenticated methods.
        // For now, assuming it might be public or have different error types.
        const response = await fetch(`${API_BASE_URL}/api/recipes/steps`, {
            headers: authHeader, // Add if/when this route is protected
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}. Failed to parse error JSON.` }));
            // Example if it becomes protected:
            // if ((response.status === 401 || response.status === 403) && AuthService.isLoggedIn()) {
            //     throw new AuthError(errData.message || "Authentication required for predefined steps. Please log in again.", response.status);
            // }
            throw new Error(errData.message || `HTTP error fetching predefined step types! status: ${response.status}`);
        }
        return response.json();
    },

    async getUserRecipes() {
        const authHeader = AuthService.getAuthHeader();
        // Early exit if no auth header is available but user is supposed to be logged in
        // This is a client-side check; backend will ultimately decide with 401/403
        if (!Object.keys(authHeader).length && AuthService.isLoggedIn()) {
            throw new AuthError("User session error. Please log in again.", 401);
        }

        const response = await fetch(`${API_BASE_URL}/api/recipes`, {
            headers: authHeader,
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({ 
                message: response.statusText || `HTTP error! Status: ${response.status}` 
            }));
            if (response.status === 401 || response.status === 403) {
                throw new AuthError(errData.message || "Your session may have expired. Please log in again.", response.status);
            }
            throw new Error(errData.message || `HTTP error fetching user recipes! status: ${response.status}`);
        }
        return response.json();
    },

    async getRecipeById(recipeId) {
        const authHeader = AuthService.getAuthHeader();
        if (!Object.keys(authHeader).length && AuthService.isLoggedIn()) {
            throw new AuthError("User session error. Please log in again.", 401);
        }
        const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
            headers: authHeader,
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}.`}));
            if (response.status === 401 || response.status === 403) {
                throw new AuthError(errData.message || `Authentication failed. Please log in again.`, response.status);
            }
            throw new Error(errData.message || `HTTP error fetching recipe ${recipeId}! status: ${response.status}`);
        }
        return response.json();
    },

    async saveRecipe(recipeData) {
        if (!AuthService.isLoggedIn()) { // This check is good
            throw new AuthError("User not logged in. Cannot save recipe.", 401);
        }
        const response = await fetch(`${API_BASE_URL}/api/recipes`, {
            method: 'POST',
            headers: { ...AuthService.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify(recipeData),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                 throw new AuthError(result?.message || "Authentication failed while saving. Please log in again.", response.status);
            }
            throw new Error(result?.message || `HTTP error saving recipe! status: ${response.status}`);
        }
        return result;
    },

    async updateRecipe(recipeId, recipeData) {
        if (!AuthService.isLoggedIn()) {
            throw new AuthError("User not logged in. Cannot update recipe.", 401);
        }
        const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
            method: 'PUT',
            headers: { ...AuthService.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify(recipeData),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                 throw new AuthError(result?.message || `Authentication failed. Please log in again.`, response.status);
            }
            throw new Error(result?.message || `HTTP error updating recipe ${recipeId}! status: ${response.status}`);
        }
        return result;
    },

    async getBaseRecipeTemplates() {
        // Assuming this remains a public endpoint, no auth header or AuthError for 401 needed here
        const response = await fetch(`${API_BASE_URL}/api/recipes/templates`);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP error fetching base recipe templates! status: ${response.status}`);
        }
        return response.json();
    },

    async deleteRecipe(recipeId) {
        if (!AuthService.isLoggedIn()) {
             throw new AuthError("User not logged in. Cannot delete recipe.", 401);
        }
        const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
            method: 'DELETE',
            headers: AuthService.getAuthHeader(),
        });
        // For DELETE, response might not have JSON body on success, or even on error sometimes.
        // Prioritize status code.
        if (!response.ok) {
            const result = await response.json().catch(() => ({ message: `Failed to delete recipe. Status: ${response.status}` }));
            if (response.status === 401 || response.status === 403) {
                 throw new AuthError(result?.message || `Authentication failed. Please log in again.`, response.status);
            }
            throw new Error(result?.message || `HTTP error deleting recipe ${recipeId}! status: ${response.status}`);
        }
        // Attempt to parse JSON for success message if backend provides it, otherwise return a standard success object.
        return response.json().catch(() => ({ success: true, message: 'Recipe deleted successfully.' }));
    },

    // --- GUIDED BAKING METHODS ---

    async startBake(recipeId) { 
        if (!AuthService.isLoggedIn()) {
            throw new AuthError("User not logged in. Cannot start bake.", 401);
        }
        const response = await fetch(`${API_BASE_URL}/api/bakes/start`, {
            method: 'POST',
            headers: { ...AuthService.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipeId }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                 throw new AuthError(result?.message || "Authentication failed when starting bake. Please log in again.", response.status);
            }
            throw new Error(result?.message || `HTTP error starting bake! status: ${response.status}`);
        }
        return result;
    },

    async completeStep(bakeLogId, currentBakeStepLogId, userNotes = '') {
        if (!AuthService.isLoggedIn()) {
            throw new AuthError("User not logged in. Cannot complete step.", 401);
        }
        const response = await fetch(`${API_BASE_URL}/api/bakes/${bakeLogId}/steps/complete`, {
            method: 'POST',
            headers: { ...AuthService.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentBakeStepLogId, userNotesForCompletedStep: userNotes }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                 throw new AuthError(result?.message || "Authentication failed. Please log in again.", response.status);
            }
            throw new Error(result?.message || `HTTP error completing step! status: ${response.status}`);
        }
        return result;
    },

    async updateBakeStatus(bakeLogId, status) {
        if (!AuthService.isLoggedIn()) {
            throw new AuthError("User not logged in. Cannot update bake status.", 401);
        }
        const response = await fetch(`${API_BASE_URL}/api/bakes/${bakeLogId}/status`, {
            method: 'PUT',
            headers: { ...AuthService.getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                 throw new AuthError(result?.message || "Authentication failed. Please log in again.", response.status);
            }
            throw new Error(result?.message || `HTTP error updating bake status! status: ${response.status}`);
        }
        return result;
    },

    async getActiveBakes() {
        if (!AuthService.isLoggedIn()) {
            // This might be called by a context before UI fully prevents it;
            // returning empty or throwing AuthError are options.
            // For consistency with user experience, throwing AuthError is better.
            throw new AuthError("User not logged in. Cannot fetch active bakes.", 401);
        }
        const response = await fetch(`${API_BASE_URL}/api/bakes/active`, {
            headers: AuthService.getAuthHeader(),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}. Failed to parse error JSON.` }));
            if (response.status === 401 || response.status === 403) {
                 throw new AuthError(errData.message || "Your session may have expired. Please log in again.", response.status);
            }
            throw new Error(errData.message || `HTTP error fetching active bakes! status: ${response.status}`);
        }
        return response.json();
    },

    async getBakeLogDetails(bakeLogId) {
        if (!AuthService.isLoggedIn()) {
            throw new AuthError("User not logged in. Cannot fetch bake details.", 401);
        }
        const authHeader = AuthService.getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/api/bakes/${bakeLogId}`, { 
             headers: authHeader,
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            if (response.status === 401 || response.status === 403) {
                 throw new AuthError(errData.message || `Authentication failed. Please log in again.`, response.status);
            }
            throw new Error(errData.message || `HTTP error fetching bake log ${bakeLogId}! status: ${response.status}`);
        }
        return response.json();
    }
};

export default RecipeService;