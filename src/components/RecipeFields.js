// src/components/RecipeFields.js
import React from 'react';
import styles from './RecipeCalculator.module.css'; // Assuming you create this CSS module

/**
 * @param {object} props
 * @param {object} props.recipe
 * @param {function(string, string): void} props.onFieldChange
 * @param {boolean} props.isSaving
 * @param {function} props.clearFeedback
 */
function RecipeFields({ recipe, onFieldChange, isSaving, clearFeedback }) {
    const handleInputChange = (e) => {
        onFieldChange(e.target.id, e.target.value);
        clearFeedback();
    };

    return (
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
            <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                <label htmlFor="targetDoughWeight">Target Dough Weight (g):</label>
                <input
                    type="number"
                    id="targetDoughWeight"
                    name="targetDoughWeight"
                    value={recipe.targetDoughWeight}
                    onChange={handleInputChange}
                    disabled={isSaving}
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
                    disabled={isSaving}
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
                    disabled={isSaving}
                />
            </div>
        </>
    );
}

export default RecipeFields;