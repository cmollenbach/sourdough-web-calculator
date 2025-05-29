// src/components/RecipeFields.js
import React from 'react';
import styles from './RecipeCalculator.module.css';

/**
 * @param {object} props
 * @param {object} props.recipe
 * @param {function(string, string): void} props.onFieldChange
 * @param {boolean} props.isSaving
 * @param {function} props.clearFeedback
 * @param {boolean} [props.isInputsSection] - Flag to determine which fields to render
 * @param {boolean} [props.isManageSection] - Flag to determine which fields to render
 * @param {boolean} [props.isInTemplateMode]
 */
function RecipeFields({ recipe, onFieldChange, isSaving, clearFeedback, isInputsSection, isManageSection , isInTemplateMode}) {
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        let processedValue = value;
        if (id === "saltPercentage") {
            // Allow empty or valid float, then format to one decimal place on blur or change
            // For now, just pass the value, formatting can be handled on blur or in reducer
             if (value === '' || /^\d*\.?\d*$/.test(value)) { // Allows empty, or numbers with optional decimal
                processedValue = value;
            } else {
                return; // Or handle invalid input
            }
        }
        onFieldChange(id, processedValue);
        clearFeedback();
    };
    
    const handleSaltBlur = (e) => {
        let value = parseFloat(e.target.value);
        if (isNaN(value)) {
            value = parseFloat(INITIAL_RECIPE_FIELDS.saltPercentage); // Or some default
        }
        onFieldChange(e.target.id, value.toFixed(1));
    };


    return (
        <>
            {isInputsSection && (
                <>
                     <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor="targetDoughWeight">Target Dough Weight (g):</label>
                        <input
                            type="number"
                            id="targetDoughWeight"
                            name="targetDoughWeight"
                            value={recipe.targetDoughWeight}
                            onChange={handleInputChange}
                            disabled={isSaving} // Keep this, as it's the primary input even in template mode
                        />
                    </div>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor="hydrationPercentage">Overall Hydration (%):</label>
                        <input
                            type="number"
                            id="hydrationPercentage"
                            name="hydrationPercentage"
                            value={recipe.hydrationPercentage}
                            onChange={handleInputChange}
                            // Disable if saving OR if in template mode (value comes from template)
                            disabled={isSaving || (isInTemplateMode && isInputsSection)} 
                        />
                    </div>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor="saltPercentage">Salt (% of total flour):</label>
                        <input
                            type="number"
                            id="saltPercentage"
                            name="saltPercentage"
                            value={recipe.saltPercentage}
                            onChange={handleInputChange}
                            onBlur={handleSaltBlur}
                            step="0.1"
                            // Disable if saving OR if in template mode (value comes from template)
                            disabled={isSaving || (isInTemplateMode && isInputsSection)}
                        />
                    </div>
                </>
            )}

            {isManageSection && (
                 <>
                    <div className={styles.inputGroup}>
                        <label htmlFor="recipe_name">Recipe Name:</label>
                        <input
                            type="text"
                            id="recipe_name"
                            name="recipe_name"
                            value={recipe.recipe_name}
                            onChange={handleInputChange}
                            disabled={isSaving}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="description">Description (Optional):</label>
                        <textarea
                            id="description"
                            name="description"
                            value={recipe.description}
                            onChange={handleInputChange}
                            disabled={isSaving}
                        />
                    </div>
                </>
            )}
        </>
    );
}
const INITIAL_RECIPE_FIELDS = { // Copied from RecipeCalculator for default salt
    saltPercentage: '2.0',
};


export default RecipeFields;