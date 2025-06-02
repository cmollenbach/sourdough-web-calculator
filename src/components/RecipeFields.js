// src/components/RecipeFields.js
import React from 'react';
import styles from './RecipeCalculator.module.css';
import { simplifiedViewRules } from '../config/simplifiedViewRules';
import AdvancedFlourDetailsComponent from './AdvancedFlourDetailsComponent';
import AutolyseSettingsComponent from './AutolyseSettingsComponent';
import ShapingInstructionsComponent from './ShapingInstructionsComponent';
import EnvironmentalFactorsComponent from './EnvironmentalFactorsComponent';

/**
 * @param {object} props
 * @param {object} props.recipe
 * @param {function(string, string): void} props.onFieldChange
 * @param {boolean} props.isSaving
 * @param {function} props.clearFeedback
 * @param {boolean} [props.isInputsSection] - Flag to determine which fields to render
 * @param {boolean} [props.isManageSection] - Flag to determine which fields to render
 * @param {boolean} [props.isInTemplateMode]
 * @param {boolean} [props.isSimplifiedViewActive]
 */
function RecipeFields({
    recipe,
    onFieldChange,
    isSaving,
    clearFeedback,
    isInputsSection,
    isManageSection,
    isInTemplateMode,
    isSimplifiedViewActive
}) {
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        onFieldChange(id, value);
        clearFeedback && clearFeedback();
    };

    return (
        <>
            {isInputsSection && (
                <>
                    <div className={styles.inputGroup}>
                        <label htmlFor="targetDoughWeight">Target Dough Weight (g):</label>
                        <input
                            type="number"
                            id="targetDoughWeight"
                            name="targetDoughWeight"
                            value={recipe.targetDoughWeight || ''}
                            onChange={handleInputChange}
                            disabled={isSaving}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="hydrationPercentage">Overall Hydration (%):</label>
                        <input
                            type="number"
                            id="hydrationPercentage"
                            name="hydrationPercentage"
                            value={recipe.hydrationPercentage || ''}
                            onChange={handleInputChange}
                            disabled={isSaving}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="saltPercentage">Salt (% of total flour):</label>
                        <input
                            type="number"
                            id="saltPercentage"
                            name="saltPercentage"
                            value={recipe.saltPercentage || ''}
                            onChange={handleInputChange}
                            disabled={isSaving}
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
                            value={recipe.recipe_name || ''}
                            onChange={handleInputChange}
                            disabled={isSaving}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="description">Description (Optional):</label>
                        <textarea
                            id="description"
                            name="description"
                            value={recipe.description || ''}
                            onChange={handleInputChange}
                            disabled={isSaving}
                        />
                    </div>
                    {!isSimplifiedViewActive && !simplifiedViewRules.fieldsToHide.includes('recipe.sourceLink') && (
                        <div className={styles.inputGroup}>
                            <label htmlFor="sourceLink">Source Link:</label>
                            <input
                                type="text"
                                id="sourceLink"
                                name="sourceLink"
                                value={recipe.sourceLink || ''}
                                onChange={handleInputChange}
                                disabled={isSaving}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Example ingredient list */}
            {recipe.ingredients && recipe.ingredients.map(ingredient => (
                <div key={ingredient.id}>
                    <span>{ingredient.name}: {ingredient.quantity}</span>
                    {!isSimplifiedViewActive && !simplifiedViewRules.fieldsToHide.includes('ingredient.bakersPercentage') && (
                        <span> ({ingredient.bakersPercentage}%)</span>
                    )}
                </div>
            ))}

            {/* Advanced sections (hidden in simplified view) */}
            {!isSimplifiedViewActive && (
                <>
                    {!simplifiedViewRules.sectionsToHide.includes('advancedFlourDetails') && (
                        <AdvancedFlourDetailsComponent />
                    )}
                    {!simplifiedViewRules.sectionsToHide.includes('autolyseSettings') && (
                        <AutolyseSettingsComponent />
                    )}
                    {!simplifiedViewRules.sectionsToHide.includes('complexShapingInstructions') && (
                        <ShapingInstructionsComponent />
                    )}
                    {!simplifiedViewRules.sectionsToHide.includes('environmentalFactors') && (
                        <EnvironmentalFactorsComponent />
                    )}
                </>
            )}
        </>
    );
}

export default RecipeFields;