// src/components/RecipeManagementActions.js
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './RecipeCalculator.module.css';
import RecipeFields from './RecipeFields'; 

/**
 * @param {object} props
 * @param {string} props.recipeName
 * @param {string} props.description
 * @param {function(string): void} props.onRecipeNameChange
 * @param {function(string): void} props.onDescriptionChange
 * @param {Array<object>} props.savedRecipes
 * @param {string} props.selectedRecipeToLoad
 * @param {function(React.ChangeEvent<HTMLSelectElement>): void} props.onLoadRecipeChange
 * @param {function(): void} props.onSaveOrUpdate
 * @param {function(): void} props.onDelete
 * @param {function(): void} props.onClearForm
 * @param {boolean} props.isLoadingRecipes
 * @param {boolean} props.isSaving
 * @param {string|null} props.currentRecipeId
 * @param {function} props.clearFeedback
 * @param {boolean} props.isInTemplateMode // Added prop
 */
function RecipeManagementActions({
    recipeName,
    description,
    onRecipeNameChange,
    onDescriptionChange,
    savedRecipes,
    selectedRecipeToLoad,
    onLoadRecipeChange,
    onSaveOrUpdate,
    onDelete,
    onClearForm,
    isLoadingRecipes,
    isSaving,
    currentRecipeId,
    clearFeedback,
    isInTemplateMode // Destructure new prop
}) {
    const { isLoggedIn } = useAuth(); 
    if (!isLoggedIn()) {
        return <p className={styles.authMessage}>Please login to save and load your recipes.</p>;
    }

    const recipeDetailsForManage = {
        recipe_name: recipeName,
        description: description,
    };
    
    const handleFieldChange = (field, value) => {
        if (field === 'recipe_name') {
            onRecipeNameChange(value);
        } else if (field === 'description') {
            onDescriptionChange(value);
        }
    };

    const getSaveButtonText = () => {
        if (isSaving) {
            return isInTemplateMode || !currentRecipeId ? 'Saving...' : 'Updating...';
        }
        return isInTemplateMode || !currentRecipeId ? 'Save as New Recipe' : 'Update Loaded Recipe';
    };

    return (
        <div className={styles.recipeManagementGroup}>
            <h3>Manage Recipe Details & Actions</h3>
            
            <RecipeFields
                recipe={recipeDetailsForManage}
                onFieldChange={handleFieldChange}
                isSaving={isSaving}
                clearFeedback={clearFeedback}
                isManageSection={true} 
            />

            <div className={styles.inputGroup}>
                <label htmlFor="loadRecipeSelect">Load Recipe:</label>
                <select
                    id="loadRecipeSelect"
                    value={selectedRecipeToLoad}
                    onChange={onLoadRecipeChange}
                    disabled={isLoadingRecipes || isSaving || isInTemplateMode} // Disable load when in template mode
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

            <div className={`${styles.actionsGroup} ${styles.mainActions}`}>
                <button onClick={onSaveOrUpdate} disabled={isSaving} className={styles.buttonWithSpinner}>
                    {getSaveButtonText()}
                    {isSaving && <span className={styles.buttonSpinner}></span>}
                </button>
                {currentRecipeId && !isInTemplateMode && ( // Only show delete if it's a saved user recipe and not in template mode
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