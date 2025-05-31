// src/components/StepEditor.js
import React, { useMemo } from 'react';
import styles from './RecipeCalculator.module.css';
import { DEFAULT_BREAD_FLOUR_ID } from '../constants/recipeConstants';
import InfoButton from './InfoButton';
import { getGenAiPrompt, getTermKeyForStepName, shouldShowInfoForStepName } from '../utils/genAiPrompts';
import FlourMixEditor from './FlourMixEditor';

const MIX_FINAL_DOUGH_STEP_ID = 3;
const LEVAIN_BUILD_STEP_ID = 1; // Add this if not already present

function StepEditor({
    step,
    index,
    predefinedSteps,
    availableIngredients,
    onStepChange,
    onDeleteStep,
    isSaving,
    isInTemplateMode,
    levainStepId,
    bulkFermentStepId,
    mixFinalDoughStepId,
    poolishBuildStepId,
    bigaBuildStepId,
    dndListeners,
    onFlourMixChange, // <-- ADD THIS LINE
}) {
    // Derived booleans
    const isPrefermentOrMainMix = useMemo(() => {
        const id = Number(step.step_id);
        return id === levainStepId ||
               id === mixFinalDoughStepId ||
               id === poolishBuildStepId ||
               id === bigaBuildStepId;
    }, [step.step_id, levainStepId, mixFinalDoughStepId, poolishBuildStepId, bigaBuildStepId]);

    const isBulkFermentSFStep = step.step_id === bulkFermentStepId;
    const isMixFinalDoughStep = step.step_id === MIX_FINAL_DOUGH_STEP_ID;
    const isLevainTypeStep = step.step_id === levainStepId || step.step_id === LEVAIN_BUILD_STEP_ID; // Check if step is a Levain type step
    const fieldsDisabled = isSaving || isInTemplateMode;

    // Handlers for flour mix (stateless)
    const handleCustomizeFlourMixChange = (checked) => {
    onStepChange(index, 'customizeFlourMix', checked);
    if (!checked) {
        onFlourMixChange(step.recipe_step_id || step.temp_client_id, []);
    }
};

    // Other field handlers
    const handleFieldChange = (field, value) => {
        onStepChange(index, field, value);
    };

    const handleNumericFieldChange = (field, value) => {
        onStepChange(index, field, value === '' ? null : Number(value));
    };

    const handleFloatFieldChange = (field, value) => {
        onStepChange(index, field, value === '' ? null : parseFloat(value));
    };

    const handleInfoClickInternal = (termKey, stepName = '') => {
        const prompt = getGenAiPrompt(termKey, stepName);
        console.log("GenAI Prompt for:", termKey, "-", prompt);
    };

    const selectId = `step-type-select-${index}`;
    const customizeFlourCheckboxId = `customize-flour-mix-${index}`;

    return (
        <div className={styles.stepItemEditor}>
            <div className={styles.stepHeader}>
                <div
                    {...(dndListeners || {})}
                    className={styles.dragHandle}
                    style={{ cursor: dndListeners ? 'grab' : 'default', padding: '0 8px', marginRight: '8px', touchAction: 'none' }}
                    title="Drag to reorder step"
                >
                    ☰
                </div>
                <h4>
                    {predefinedSteps && predefinedSteps.length > 0 && !isInTemplateMode ? (
                        <select
                            id={selectId}
                            name={selectId}
                            value={step.step_id || ''}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleNumericFieldChange('step_id', e.target.value);
                            }}
                            disabled={isSaving}
                            className={styles.stepTypeSelect}
                        >
                            <option value="">-- Select Step Type --</option>
                            {predefinedSteps.map(ps => (
                                <option key={ps.step_id} value={ps.step_id}>{ps.step_name}</option>
                            ))}
                        </select>
                    ) : (
                        <span style={{ marginLeft: 'var(--spacing-sm)', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-text)' }} >
                            {step.step_name || 'Unnamed Step'}
                        </span>
                    )}
                    {shouldShowInfoForStepName(step.step_name) && (
                        <InfoButton
                            termKey={getTermKeyForStepName(step.step_name)}
                            termDisplayName={step.step_name}
                            onClick={handleInfoClickInternal}
                        />
                    )}
                </h4>
                {!isInTemplateMode && !isMixFinalDoughStep && (
                    <button
                        type="button"
                        className="btn btn-danger btn-small"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteStep(index);
                        }}
                        disabled={isSaving}
                    >
                        Remove
                    </button>
                )}
            </div>
            
            {/* Standard Step Fields */}
            {isBulkFermentSFStep ? (
                <>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-total-bulk-time-${index}`}>
                            Total Bulk Time (mins):
                            <InfoButton termKey="total_bulk_time" termDisplayName="Total Bulk Time" onClick={handleInfoClickInternal} />
                        </label>
                        <input type="number" id={`step-total-bulk-time-${index}`} name={`step-total-bulk-time-${index}`} placeholder="e.g., 240" value={step.duration_override ?? ''} onChange={(e) => handleNumericFieldChange('duration_override', e.target.value)} disabled={fieldsDisabled} />
                    </div>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-sf-interval-${index}`}>
                            S&F Interval (mins):
                            <InfoButton termKey="sf_interval" termDisplayName="S&F Interval" onClick={handleInfoClickInternal} />
                        </label>
                        <input type="number" id={`step-sf-interval-${index}`} name={`step-sf-interval-${index}`} placeholder="e.g., 30" value={step.stretch_fold_interval_minutes ?? ''} onChange={(e) => handleNumericFieldChange('stretch_fold_interval_minutes', e.target.value)} disabled={fieldsDisabled} />
                    </div>
                </>
            ) : (
                <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                    <label htmlFor={`step-duration-${index}`}>
                        Duration (mins):
                        {!isLevainTypeStep && (
                            <InfoButton termKey="step_duration" termDisplayName="Step Duration" onClick={handleInfoClickInternal} />
                        )}
                    </label>
                    <input type="number" id={`step-duration-${index}`} name={`step-duration-${index}`} placeholder="e.g., 60" value={step.duration_override ?? ''} onChange={(e) => handleNumericFieldChange('duration_override', e.target.value)} disabled={fieldsDisabled} />
                </div>
            )}
            <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                <label htmlFor={`step-temp-${index}`}>
                    Temp (°C):
                    <InfoButton termKey="step_temperature" termDisplayName="Step Temperature" onClick={handleInfoClickInternal} />
                </label>
                <input type="number" id={`step-temp-${index}`} name={`step-temp-${index}`} placeholder="e.g., 24" value={step.target_temperature_celsius ?? ''} onChange={(e) => handleFloatFieldChange('target_temperature_celsius', e.target.value)} disabled={fieldsDisabled} />
            </div>
            {isLevainTypeStep && (
                <>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-levain-contrib-${index}`}>
                            Levain Contrib. (%):
                            <InfoButton termKey="levain_contribution_pct" termDisplayName="Levain Contribution %" onClick={handleInfoClickInternal} />
                        </label>
                        <input type="number" id={`step-levain-contrib-${index}`} name={`step-levain-contrib-${index}`} placeholder="e.g., 20" value={step.contribution_pct ?? ''} onChange={(e) => handleFloatFieldChange('contribution_pct', e.target.value)} disabled={fieldsDisabled} />
                    </div>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-levain-hydra-${index}`}>
                            Levain Hydration (%):
                            <InfoButton termKey="levain_target_hydration" termDisplayName="Levain Hydration %" onClick={handleInfoClickInternal} />
                        </label>
                        <input type="number" id={`step-levain-hydra-${index}`} name={`step-levain-hydra-${index}`} placeholder="e.g., 100" value={step.target_hydration ?? ''} onChange={(e) => handleFloatFieldChange('target_hydration', e.target.value)} disabled={fieldsDisabled} />
                    </div>
                </>
            )}

            {/* Flour Customization Section */}
            {isPrefermentOrMainMix && !isInTemplateMode && (
                <FlourMixEditor
     customizeFlourMix={step.customizeFlourMix || false}
    setCustomizeFlourMix={handleCustomizeFlourMixChange}
    flours={step.stageIngredients}
    setFlours={newFlours => onFlourMixChange(step.recipe_step_id || step.temp_client_id, newFlours)}
    availableIngredients={availableIngredients}
    fieldsDisabled={fieldsDisabled}
    customizeFlourCheckboxId={customizeFlourCheckboxId}
    DEFAULT_BREAD_FLOUR_ID={DEFAULT_BREAD_FLOUR_ID}
    renderInfoButton={handleInfoClickInternal}
    onFlourMixChange={onFlourMixChange}
    stepId={step.recipe_step_id || step.temp_client_id}         // <-- AND THIS LINE
                />
            )}

            <div className={styles.inputGroup}>
                <label htmlFor={`step-notes-${index}`}>Notes:</label>
                <textarea
                    id={`step-notes-${index}`}
                    name={`step-notes-${index}`}
                    value={step.notes || ''}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { e.stopPropagation(); handleFieldChange('notes', e.target.value);}}
                    disabled={fieldsDisabled}
                />
            </div>
        </div>
    );
}

export default StepEditor;