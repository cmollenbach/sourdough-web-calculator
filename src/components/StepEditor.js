// src/components/StepEditor.js
import React from 'react';
import styles from './RecipeCalculator.module.css';

// Helper function to generate GenAI prompts
const getGenAiPrompt = (termKey, stepName = '') => {
    switch (termKey) {
        case 'step_name_levain_build':
            return `Explain what a "Levain Build" is in the context of sourdough baking, including its purpose, typical process, and common ingredients.`;
        case 'levain_contribution_pct':
            return `Explain "Levain Contribution Percentage" in sourdough baking. How is it calculated, what does it affect, what are typical ranges, and how does it interact with levain hydration?`;
        case 'levain_target_hydration':
            return `Explain "Levain Target Hydration" in sourdough baking. How is it calculated, what does it affect (e.g., activity, flavor, dough consistency), and what are typical ranges?`;
        case 'autolyse':
            return `What is "Autolyse" in sourdough bread making? Explain its benefits, how it's typically done, and how it impacts the dough.`;
        case 'bulk_fermentation_sf':
            return `Explain "Bulk Fermentation with Stretch and Fold" in sourdough baking. What is its purpose, how are stretch and folds performed, what are the signs of a complete bulk fermentation, and how does temperature affect it?`;
        case 'total_bulk_time':
            return `Explain the importance of "Total Bulk Time" in sourdough baking. What factors influence it, and how do you determine when it's complete for a bulk fermentation step (especially one with stretch and folds)?`;
        case 'sf_interval':
            return `What is the "S&F Interval (Stretch and Fold Interval)" during bulk fermentation in sourdough baking? How does the interval timing affect dough development?`;
        case 'proofing':
            return `Explain "Proofing" (or final proof) in sourdough baking. What is its purpose, how does it differ from bulk fermentation, and what are the signs it's complete, considering both room temperature and cold proofing?`;
        case 'baking':
            return `Provide a general explanation of the "Baking" stage for sourdough bread. Cover common techniques like using a Dutch oven, steam, and typical temperature and time ranges.`;
        case 'step_duration':
            return `Explain how "Duration (mins)" impacts various sourdough steps like autolyse, proofing, or specific rests. What are the general considerations for determining step duration?`;
        case 'step_temperature':
            return `Explain the importance of "Temperature (°C)" in sourdough baking for various steps like levain build, bulk fermentation, and proofing. How does temperature control affect fermentation speed and dough development?`;
        // Add more cases for other terms as you identify them
        default:
            if (stepName) {
                return `Explain the sourdough baking step or concept: "${stepName}". What is its purpose and typical process?`;
            }
            return `Explain the sourdough baking concept: "${termKey.replace(/_/g, ' ')}".`;
    }
};

/**
 * @param {object} props
 * @param {object} props.step
 * @param {number} props.index
 * @param {Array<object>} props.predefinedSteps
 * @param {function(number, string, any): void} props.onStepChange
 * @param {function(number): void} props.onDeleteStep
 * @param {boolean} props.isSaving
 * @param {boolean} props.isInTemplateMode
 * @param {string | null} props.bulkFermentStepId
 * @param {string | null} props.levainStepId
 */
function StepEditor({ step, index, predefinedSteps, onStepChange, onDeleteStep, isSaving, isInTemplateMode, bulkFermentStepId, levainStepId }) {
    const isBulkFermentSFStep = step.step_id === bulkFermentStepId;
    const isLevainStep = step.step_id === levainStepId;
    const fieldsDisabled = isSaving || isInTemplateMode;

    const handleFieldChange = (field, value) => {
        onStepChange(index, field, value);
    };

    const handleNumericFieldChange = (field, value) => {
        onStepChange(index, field, value === '' ? null : Number(value));
    };

    const handleFloatFieldChange = (field, value) => {
        onStepChange(index, field, value === '' ? null : parseFloat(value));
    };

    const handleInfoClick = (termKey, stepName = '') => {
        const prompt = getGenAiPrompt(termKey, stepName);
        console.log("GenAI Prompt for:", termKey, "-", prompt);
        // Future enhancement: Display this prompt in a modal with a "Copy" button.
        // For now, a simple alert can also work if you prefer immediate feedback:
        // alert(`Suggested GenAI Prompt:\n\n${prompt}`);
    };

    const renderInfoButton = (termKey, termDisplayName) => (
        <button
            type="button"
            onClick={() => handleInfoClick(termKey, termDisplayName)}
            title={`Get AI explanation for ${termDisplayName || termKey.replace(/_/g, ' ')}`}
            className={styles.infoButton}
            aria-label={`Get explanation for ${termDisplayName || termKey.replace(/_/g, ' ')}`}
        >
            ⓘ
        </button>
    );

    // Helper to decide if a step name warrants an info button
    const shouldShowInfoForStepName = (name) => {
        const notableStepNames = ['Levain Build', 'Autolyse', 'Bulk Fermentation with Stretch and Fold', 'Proofing', 'Baking'];
        return notableStepNames.includes(name);
    };
    const getTermKeyForStepName = (name) => {
        if (name === 'Levain Build') return 'step_name_levain_build';
        if (name === 'Autolyse') return 'autolyse';
        if (name === 'Bulk Fermentation with Stretch and Fold') return 'bulk_fermentation_sf';
        if (name === 'Proofing') return 'proofing';
        if (name === 'Baking') return 'baking';
        return name; // fallback or more generic key
    };


    return (
        <div className={styles.stepItemEditor}>
            <div className={styles.stepHeader}>
                <h4>
                    Step {step.step_order || index + 1}:
                    {/* MODIFIED: Conditional display for step name/type */}
                    {predefinedSteps && predefinedSteps.length > 0 && !isInTemplateMode ? (
                        // Fully interactive mode for logged-in users not in template mode
                        <select
                            value={step.step_id || ''}
                            onChange={(e) => handleNumericFieldChange('step_id', e.target.value)}
                            disabled={isSaving} // isInTemplateMode is false here, so only check isSaving
                            className={styles.stepTypeSelect}
                        >
                            <option value="">-- Select Step Type --</option>
                            {predefinedSteps.map(ps => (
                                <option key={ps.step_id} value={ps.step_id}>{ps.step_name}</option>
                            ))}
                        </select>
                    ) : (
                        // Read-only display for step name (for public view or when in template mode for logged-in user)
                        <span style={{ marginLeft: '8px', fontWeight: 'normal', color: 'var(--color-text)' }} className={styles.stepNameTextDisplay}>
                            {step.step_name || 'Unnamed Step'}
                        </span>
                    )}
                    {/* Info button logic remains the same, relying on step.step_name */}
                    {shouldShowInfoForStepName(step.step_name) && renderInfoButton(getTermKeyForStepName(step.step_name), step.step_name)}
                </h4>
                {/* END OF MODIFIED PART */}
                {!isInTemplateMode && (
                    <button
                        type="button"
                        className={styles.removeStepBtn}
                        onClick={() => onDeleteStep(index)}
                        disabled={isSaving}
                    >
                        Remove
                    </button>
                )}
            </div>

            {isBulkFermentSFStep ? (
                <>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-total-bulk-time-${index}`}>
                            Total Bulk Time (mins):
                            {renderInfoButton('total_bulk_time', 'Total Bulk Time')}
                        </label>
                        <input
                            type="number"
                            id={`step-total-bulk-time-${index}`}
                            placeholder="e.g., 240"
                            value={step.duration_override ?? ''}
                            onChange={e => handleNumericFieldChange('duration_override', e.target.value)}
                            disabled={fieldsDisabled}
                        />
                    </div>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-sf-interval-${index}`}>
                            S&F Interval (mins):
                            {renderInfoButton('sf_interval', 'S&F Interval')}
                        </label>
                        <input
                            type="number"
                            id={`step-sf-interval-${index}`}
                            placeholder="e.g., 30"
                            value={step.stretch_fold_interval_minutes ?? ''}
                            onChange={e => handleNumericFieldChange('stretch_fold_interval_minutes', e.target.value)}
                            disabled={fieldsDisabled}
                        />
                    </div>
                </>
            ) : (
                <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                    <label htmlFor={`step-duration-${index}`}>
                        Duration (mins):
                        {!isLevainStep && renderInfoButton('step_duration', 'Step Duration')}
                    </label>
                    <input
                        type="number"
                        id={`step-duration-${index}`}
                        placeholder="e.g., 60"
                        value={step.duration_override ?? ''}
                        onChange={e => handleNumericFieldChange('duration_override', e.target.value)}
                        disabled={fieldsDisabled}
                    />
                </div>
            )}

            <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                <label htmlFor={`step-temp-${index}`}>
                    Temp (°C):
                    {renderInfoButton('step_temperature', 'Step Temperature')}
                </label>
                <input
                    type="number"
                    id={`step-temp-${index}`}
                    placeholder="e.g., 24"
                    value={step.target_temperature_celsius ?? ''}
                    onChange={e => handleFloatFieldChange('target_temperature_celsius', e.target.value)}
                    disabled={fieldsDisabled}
                />
            </div>

            {isLevainStep && (
                <>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-levain-contrib-${index}`}>
                            Levain Contrib. (%):
                            {renderInfoButton('levain_contribution_pct', 'Levain Contribution %')}
                        </label>
                        <input
                            type="number"
                            id={`step-levain-contrib-${index}`}
                            placeholder="e.g., 20"
                            value={step.contribution_pct ?? ''}
                            onChange={e => handleFloatFieldChange('contribution_pct', e.target.value)}
                            disabled={fieldsDisabled}
                        />
                    </div>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-levain-hydra-${index}`}>
                            Levain Hydration (%):
                            {renderInfoButton('levain_target_hydration', 'Levain Hydration %')}
                        </label>
                        <input
                            type="number"
                            id={`step-levain-hydra-${index}`}
                            placeholder="e.g., 100"
                            value={step.target_hydration ?? ''}
                            onChange={e => handleFloatFieldChange('target_hydration', e.target.value)}
                            disabled={fieldsDisabled}
                        />
                    </div>
                </>
            )}
            <div className={styles.inputGroup}>
                <label htmlFor={`step-notes-${index}`}>Notes:</label>
                <textarea
                    id={`step-notes-${index}`}
                    value={step.notes || ''}
                    onChange={e => handleFieldChange('notes', e.target.value)}
                    disabled={fieldsDisabled}
                />
            </div>
        </div>
    );
}

export default StepEditor;