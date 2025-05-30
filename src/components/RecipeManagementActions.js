// src/components/RecipeManagementActions.js
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './RecipeCalculator.module.css'; // Keep for layout styles if any are specific here
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
 * @param {boolean} props.isInTemplateMode
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
    isInTemplateMode
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
        <div className={styles.manageRecipesSection}> {/* Use module style for the section's own layout */}
            <h3>Manage Recipe Details & Actions</h3>

            <RecipeFields
                recipe={recipeDetailsForManage}
                onFieldChange={handleFieldChange}
                isSaving={isSaving}
                clearFeedback={clearFeedback}
                isManageSection={true}
            />

            <div className={styles.inputGroup}> {/* Module style for input group layout */}
                <label htmlFor="loadRecipeSelect">Load Recipe:</label>
                <select
                    id="loadRecipeSelect"
                    value={selectedRecipeToLoad}
                    onChange={onLoadRecipeChange}
                    disabled={isLoadingRecipes || isSaving }
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
                <button
                    onClick={onSaveOrUpdate}
                    disabled={isSaving}
                    className="btn btn-primary buttonWithSpinner" /* UPDATED */
                >
                    {getSaveButtonText()}
                    {isSaving && <span className="buttonSpinner"></span>} {/* Global spinner */}
                </button>
                {currentRecipeId && !isInTemplateMode && (
                    <button
                        onClick={onDelete}
                        disabled={isSaving}
                        className="btn btn-danger buttonWithSpinner" /* UPDATED */
                    >
                        {isSaving ? 'Deleting...' : 'Delete Loaded Recipe'}
                        {isSaving && <span className="buttonSpinner"></span>} {/* Global spinner */}
                    </button>
                )}
                <button
                    type="button"
                    onClick={onClearForm}
                    className="btn btn-secondary buttonWithSpinner" /* UPDATED */
                    disabled={isSaving}
                >
                    Clear Form / New
                    {isSaving && <span className="buttonSpinner"></span>} {/* Global spinner */}
                </button>
            </div>
        </div>
    );
}

export default RecipeManagementActions;