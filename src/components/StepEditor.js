// src/components/StepEditor.js
import React from 'react';
import styles from './RecipeCalculator.module.css';

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

    return (
        <div className={styles.stepItemEditor}>
            <div className={styles.stepHeader}>
                <h4>
                    Step {step.step_order || index + 1}:
                    <select
                        value={step.step_id || ''}
                        onChange={(e) => handleNumericFieldChange('step_id', e.target.value)}
                        disabled={isSaving || predefinedSteps.length === 0 || isInTemplateMode} // Updated: also disabled in template mode
                        className={styles.stepTypeSelect}
                    >
                        <option value="">-- Select Step Type --</option>
                        {predefinedSteps.map(ps => (
                            <option key={ps.step_id} value={ps.step_id}>{ps.step_name}</option>
                        ))}
                    </select>
                </h4>
                {/* Updated: Conditionally render the Remove button; hide in template mode */}
                {!isInTemplateMode && (
                    <button
                        type="button"
                        className={styles.removeStepBtn}
                        onClick={() => onDeleteStep(index)}
                        disabled={isSaving} // Only disabled by isSaving now, as it's hidden in template mode
                    >
                        Remove
                    </button>
                )}
            </div>

            {isBulkFermentSFStep ? (
                <>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-total-bulk-time-${index}`}>Total Bulk Time (mins):</label>
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
                        <label htmlFor={`step-sf-interval-${index}`}>S&F Interval (mins):</label>
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
                    <label htmlFor={`step-duration-${index}`}>Duration (mins):</label>
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
                <label htmlFor={`step-temp-${index}`}>Temp (°C):</label>
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
                        <label htmlFor={`step-levain-contrib-${index}`}>Levain Contrib. (%):</label>
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
                        <label htmlFor={`step-levain-hydra-${index}`}>Levain Hydration (%):</label>
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