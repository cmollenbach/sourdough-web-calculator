// src/components/RecipeManagementActions.js
import React from 'react';
import AuthService from '../services/AuthService';
import styles from './RecipeCalculator.module.css';

/**
 * @param {object} props
 * @param {Array<object>} props.savedRecipes
 * @param {string} props.selectedRecipeToLoad
 * @param {function(React.ChangeEvent<HTMLSelectElement>): void} props.onLoadRecipeChange
 * @param {function(): void} props.onSaveOrUpdate
 * @param {function(): void} props.onDelete
 * @param {function(): void} props.onClearForm
 * @param {boolean} props.isLoadingRecipes
 * @param {boolean} props.isSaving
 * @param {string|null} props.currentRecipeId
 */
function RecipeManagementActions({
    savedRecipes,
    selectedRecipeToLoad,
    onLoadRecipeChange,
    onSaveOrUpdate,
    onDelete,
    onClearForm,
    isLoadingRecipes,
    isSaving,
    currentRecipeId
}) {
    if (!AuthService.isLoggedIn()) {
        return <p className={styles.authMessage}>Please login to save and load your recipes.</p>;
    }

    return (
        <div className={styles.recipeManagementGroup}>
            <h3>Manage Recipes</h3>
            <div className={styles.inputGroup}>
                <label htmlFor="loadRecipeSelect">Load Recipe:</label>
                <select
                    id="loadRecipeSelect"
                    value={selectedRecipeToLoad}
                    onChange={onLoadRecipeChange}
                    disabled={isLoadingRecipes || isSaving}
                >
                    <option value="">Select a recipe...</option>
                    {savedRecipes.map(recipe => (
                        <option key={recipe.recipe_id} value={recipe.recipe_id}>
                            {recipe.recipe_name}
                        </option>
                    ))}
                </select>
                {isLoadingRecipes && <p className={styles.loadingMessage}>Loading recipes...</p>}
                {!isLoadingRecipes && savedRecipes.length === 0 && (
                    <p className={styles.infoMessage}>No saved recipes. Fill out the form and save!</p>
                )}
            </div>

            <hr />

            <div className={`${styles.actionsGroup} ${styles.mainActions}`}>
                <button onClick={onSaveOrUpdate} disabled={isSaving} className={styles.buttonWithSpinner}>
                    {isSaving ? (currentRecipeId ? 'Updating...' : 'Saving...') : (currentRecipeId ? 'Update Loaded Recipe' : 'Save as New Recipe')}
                    {isSaving && <span className={styles.buttonSpinner}></span>}
                </button>
                {currentRecipeId && (
                    <button onClick={onDelete} disabled={isSaving} className={`${styles.buttonDanger} ${styles.buttonWithSpinner}`}>
                        {isSaving ? 'Deleting...' : 'Delete Loaded Recipe'}
                        {isSaving && <span className={styles.buttonSpinner}></span>}
                    </button>
                )}
                <button type="button" onClick={onClearForm} className={`${styles.buttonSecondary} ${styles.buttonWithSpinner}`} disabled={isSaving}>
                    Clear Form / New
                    {isSaving && <span className={styles.buttonSpinner}></span>}
                </button>
            </div>
        </div>
    );
}

export default RecipeManagementActions;