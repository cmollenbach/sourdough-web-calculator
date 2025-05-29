// src/components/BaseTemplates.js
import React from 'react';
import styles from './RecipeCalculator.module.css'; // Assuming styles are in RecipeCalculator.module.css

/**
 * Displays a section with base recipe templates that users can select to pre-fill the calculator.
 *
 * @param {object} props
 * @param {Array<object>} props.baseRecipeTemplates - Array of template objects.
 * @param {boolean} props.isLoadingBaseTemplates - Flag indicating if templates are being loaded.
 * @param {string|number|null} props.activeTemplateId - The ID of the currently active/selected template.
 * @param {function(object): void} props.onLoadTemplateData - Callback function when a template is selected.
 * @param {boolean} props.isInTemplateMode - Flag indicating if the calculator is currently in template mode.
 */
function BaseTemplates({
    baseRecipeTemplates,
    isLoadingBaseTemplates,
    activeTemplateId,
    onLoadTemplateData,
    isInTemplateMode
}) {
    if (isLoadingBaseTemplates) {
        return <p className={styles.loadingMessage}>Loading templates...</p>;
    }

    if (!baseRecipeTemplates || baseRecipeTemplates.length === 0) {
        return null; // Or a message indicating no templates are available
    }

    return (
        <div className={styles.baseTemplatesSection}>
            <h3>Start with a Template</h3>
            <p className={styles.templateIntroText}>
                Select one of our professionally designed sourdough templates to get started.
                You can adjust the dough weight and then save it as your own recipe.
            </p>
            <div className={styles.templateCardsContainer}>
                {baseRecipeTemplates.map(template => (
                    <div
                        key={template.recipe_id}
                        className={`${styles.templateCard} ${template.recipe_id === activeTemplateId ? styles.templateCardActive : ''}`}
                        onClick={() => onLoadTemplateData(template)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') onLoadTemplateData(template); }}
                        aria-pressed={template.recipe_id === activeTemplateId}
                        aria-label={`Load ${template.recipe_name} template`}
                    >
                        <div className={styles.templateCardContent}>
                            <h4>{template.recipe_name}</h4>
                            <p>{template.description || "A great starting point for your sourdough journey."}</p>
                        </div>
                        {/* You could add a button here if preferred over clicking the whole card */}
                        {/* <button
                            className={styles.templateCardButton}
                            onClick={() => onLoadTemplateData(template)}
                            aria-label={`Load ${template.recipe_name} template`}
                        >
                            Use Template
                        </button> */}
                    </div>
                ))}
            </div>
            {isInTemplateMode && (
                <div className={styles.templateModeBanner}>
                    <p><strong>Template Mode:</strong> You are viewing a base template. Adjust inputs and "Save as New Recipe".</p>
                </div>
            )}
        </div>
    );
}

export default BaseTemplates;