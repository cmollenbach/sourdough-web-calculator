// src/components/StepEditor.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import styles from './RecipeCalculator.module.css';
import { DEFAULT_BREAD_FLOUR_ID, LEVAIN_BUILD_STEP_NAME } from '../constants/recipeConstants';

const getGenAiPrompt = (termKey, stepName = '') => {
    // (Your existing getGenAiPrompt function - kept for brevity)
    switch (termKey) {
        case 'step_name_levain_build':
            return `Explain what a "Levain Build" is in the context of sourdough baking...`;
        case 'levain_contribution_pct':
            return `Explain "Levain Contribution Percentage" in sourdough baking...`;
        case 'levain_target_hydration':
            return `Explain "Levain Target Hydration" in sourdough baking...`;
        case 'autolyse':
            return `What is "Autolyse" in sourdough bread making?...`;
        case 'bulk_fermentation_sf':
            return `Explain "Bulk Fermentation with Stretch and Fold" in sourdough baking...`;
        case 'total_bulk_time':
            return `Explain the importance of "Total Bulk Time" in sourdough baking...`;
        case 'sf_interval':
            return `What is the "S&F Interval (Stretch and Fold Interval)"...`;
        case 'proofing':
            return `Explain "Proofing" (or final proof) in sourdough baking...`;
        case 'baking':
            return `Provide a general explanation of the "Baking" stage for sourdough bread...`;
        case 'step_duration':
            return `Explain how "Duration (mins)" impacts various sourdough steps...`;
        case 'step_temperature':
            return `Explain the importance of "Temperature (°C)" in sourdough baking...`;
        case 'flour_mix_customization':
            return `Explain the concept of using a custom flour mix in sourdough steps...`;
        default:
            if (stepName) return `Explain the sourdough baking step or concept: "${stepName}". What is its purpose and typical process?`;
            return `Explain the sourdough baking concept: "${termKey.replace(/_/g, ' ')}".`;
    }
};

const createSignature = (obj) => JSON.stringify(obj);

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
    dndListeners
}) {
    const [customizeFlourMix, setCustomizeFlourMix] = useState(false);
    const [bespokeFlours, setBespokeFlours] = useState([{ ingredient_id: DEFAULT_BREAD_FLOUR_ID, percentage: 100, is_wet: false, temp_ui_id: Date.now() }]);
    const previousSentIngredientsRef = useRef(null);

    const isPrefermentOrMainMix = useMemo(() => {
        const id = Number(step.step_id);
        return id === levainStepId ||
               id === mixFinalDoughStepId ||
               id === poolishBuildStepId ||
               id === bigaBuildStepId;
    }, [step.step_id, levainStepId, mixFinalDoughStepId, poolishBuildStepId, bigaBuildStepId]);

    // Effect to initialize local state from step prop (initEffect)
    useEffect(() => {
        if (step && Array.isArray(step.stageIngredients) && isPrefermentOrMainMix && availableIngredients && availableIngredients.length > 0) {
            const flourIngredientsInProp = step.stageIngredients.filter(ing => {
                const ingInfo = availableIngredients.find(i => i.ingredient_id === Number(ing.ingredient_id));
                return ingInfo && !ingInfo.is_wet && ingInfo.ingredient_name?.toLowerCase() !== 'salt';
            });

            const hasCustomMixInProps = flourIngredientsInProp.length > 1 || 
                                      (flourIngredientsInProp.length === 1 && Number(flourIngredientsInProp[0].ingredient_id) !== DEFAULT_BREAD_FLOUR_ID);

            if (hasCustomMixInProps) {
                setCustomizeFlourMix(true);
                setBespokeFlours(flourIngredientsInProp.map((ing, idx) => ({
                    ingredient_id: Number(ing.ingredient_id),
                    percentage: parseFloat(ing.percentage || 0),
                    is_wet: false,
                    temp_ui_id: ing.temp_ui_id || (Date.now() + idx + Math.random())
                })));
            } else {
                setCustomizeFlourMix(false);
                const defaultFlour = availableIngredients.find(ing => ing.ingredient_id === DEFAULT_BREAD_FLOUR_ID && !ing.is_wet) || availableIngredients.find(ing => !ing.is_wet);
                setBespokeFlours([{ 
                    ingredient_id: defaultFlour ? defaultFlour.ingredient_id : null, 
                    percentage: 100, 
                    is_wet: false, 
                    temp_ui_id: Date.now() + Math.random() 
                }]);
            }
        } else if (!isPrefermentOrMainMix) {
            setCustomizeFlourMix(false);
            const defaultFlour = availableIngredients && availableIngredients.find(ing => ing.ingredient_id === DEFAULT_BREAD_FLOUR_ID && !ing.is_wet) || (availableIngredients && availableIngredients.find(ing => !ing.is_wet));
            setBespokeFlours([{ 
                ingredient_id: defaultFlour ? defaultFlour.ingredient_id : null, 
                percentage: 100, 
                is_wet: false, 
                temp_ui_id: Date.now() + Math.random() 
            }]);
        }
        previousSentIngredientsRef.current = createSignature(step.stageIngredients || []);
    // Added 'step' to dependency array to satisfy ESLint and ensure effect runs if the whole step object changes.
    // 'isPrefermentOrMainMix' and 'availableIngredients' are also dependencies.
    }, [step, isPrefermentOrMainMix, availableIngredients]);


    // Effect to sync local flour changes back to parent (syncEffect)
    useEffect(() => {
        if (!isPrefermentOrMainMix || !availableIngredients || availableIngredients.length === 0) return;

        let finalFlourIngredients;
        if (customizeFlourMix) {
            finalFlourIngredients = bespokeFlours.map(f => ({
                ingredient_id: Number(f.ingredient_id),
                percentage: parseFloat(f.percentage || 0), // Default to 0 if NaN/null
                is_wet: false,
            })).filter(f => f.ingredient_id != null && f.ingredient_id !== 0); // Ensure valid ingredient ID
        } else {
            const defaultFlour = availableIngredients.find(ing => ing.ingredient_id === DEFAULT_BREAD_FLOUR_ID && !ing.is_wet) || availableIngredients.find(ing => !ing.is_wet);
            if (defaultFlour) {
                finalFlourIngredients = [{ ingredient_id: defaultFlour.ingredient_id, percentage: 100, is_wet: false }];
            } else {
                finalFlourIngredients = [];
            }
        }

        const nonFlourStageIngredients = (step.stageIngredients || []).filter(ing => {
            const ingInfo = availableIngredients.find(i => i.ingredient_id === Number(ing.ingredient_id));
            return !ingInfo || ingInfo.is_wet || ingInfo.ingredient_name?.toLowerCase() === 'salt';
        });

        const newStageIngredients = [...finalFlourIngredients, ...nonFlourStageIngredients];
        const newSignature = createSignature(newStageIngredients);

        if (newSignature !== previousSentIngredientsRef.current) {
            onStepChange(index, 'stageIngredients', newStageIngredients);
            previousSentIngredientsRef.current = newSignature;
        }
    }, [
        customizeFlourMix,
        bespokeFlours,
        isPrefermentOrMainMix,
        onStepChange,
        index,
        availableIngredients,
        step.stageIngredients // Keep this to react to external changes if necessary
    ]);

    const handleCustomizeFlourToggle = () => {
        const newCustomizeState = !customizeFlourMix;
        setCustomizeFlourMix(newCustomizeState);
        // If toggling OFF, reset bespokeFlours to default
        if (!newCustomizeState) {
            const defaultFlour = availableIngredients.find(ing => ing.ingredient_id === DEFAULT_BREAD_FLOUR_ID && !ing.is_wet) || availableIngredients.find(ing => !ing.is_wet);
            setBespokeFlours([{ 
                ingredient_id: defaultFlour ? defaultFlour.ingredient_id : null, 
                percentage: 100, 
                is_wet: false, 
                temp_ui_id: Date.now() + Math.random() 
            }]);
        } else { // If toggling ON
             if (bespokeFlours.length === 0 || (bespokeFlours.length === 1 && bespokeFlours[0].ingredient_id === DEFAULT_BREAD_FLOUR_ID && bespokeFlours[0].percentage === 100)) {
                 const firstAvailableFlour = availableIngredients.find(ing => !ing.is_wet && ing.ingredient_name?.toLowerCase() !== 'salt');
                 const initialBespoke = [{ 
                    ingredient_id: firstAvailableFlour ? firstAvailableFlour.ingredient_id : null, 
                    percentage: 100, 
                    is_wet: false, 
                    temp_ui_id: Date.now() + Math.random() 
                }];
                setBespokeFlours(adjustPercentages(initialBespoke)); // adjust immediately
            } else {
                // If already has some custom flours (e.g. loaded from recipe), just use them.
                setBespokeFlours(adjustPercentages([...bespokeFlours]));
            }
        }
    };
    
    const adjustPercentages = (floursToAdjust) => {
        let currentFlours = JSON.parse(JSON.stringify(floursToAdjust)); // Deep copy to avoid state mutation issues

        if (!Array.isArray(currentFlours) || currentFlours.length === 0) return [];
    
        if (currentFlours.length === 1) {
            currentFlours[0].percentage = 100;
        } else {
            let totalPercentage = 0;
            const lastFlourIndex = currentFlours.length - 1;
    
            // Sum percentages of all flours except the last one
            for (let i = 0; i < lastFlourIndex; i++) {
                const perc = parseFloat(currentFlours[i].percentage);
                totalPercentage += isNaN(perc) ? 0 : perc;
            }
    
            // Clamp sum to prevent last flour from becoming excessively large if others are too small
            totalPercentage = Math.min(totalPercentage, 100);
            
            // The last flour makes up the remainder
            currentFlours[lastFlourIndex].percentage = Math.max(0, 100 - totalPercentage);
        }
    
        // Ensure all percentages are numbers and properly formatted
        return currentFlours.map(f => ({
            ...f,
            percentage: parseFloat( (f.percentage != null && !isNaN(f.percentage) ? f.percentage : 0).toFixed(2) )
        }));
    };

    const handleBespokeFlourChange = (flourIndex, field, value) => {
        let newBespokeFlours = bespokeFlours.map((flour, idx) => {
            if (idx === flourIndex) {
                let processedValue;
                if (field === 'ingredient_id') {
                    processedValue = Number(value);
                } else { // percentage
                    processedValue = (value === '' || value == null) ? 0 : parseFloat(value);
                    // Clamp individual percentage input
                    processedValue = Math.max(0, Math.min(100, processedValue || 0));
                }
                return { ...flour, [field]: processedValue };
            }
            return flour;
        });
        
        newBespokeFlours = adjustPercentages(newBespokeFlours);
        setBespokeFlours(newBespokeFlours);
    };
    

    const addBespokeFlour = () => {
        const currentFlourIds = new Set(bespokeFlours.map(f => f.ingredient_id));
        const firstAvailableNewFlour = 
            availableIngredients.find(ing => !ing.is_wet && ing.ingredient_name?.toLowerCase() !== 'salt' && !currentFlourIds.has(ing.ingredient_id)) ||
            availableIngredients.find(ing => !ing.is_wet && ing.ingredient_name?.toLowerCase() !== 'salt'); // Fallback if all are used (less likely)
        
        let newFlourEntry = { 
            ingredient_id: firstAvailableNewFlour ? firstAvailableNewFlour.ingredient_id : null, 
            percentage: 0, // Will be adjusted by adjustPercentages
            is_wet: false, 
            temp_ui_id: Date.now() + Math.random()
        };

        let updatedBespokeFlours = [...bespokeFlours, newFlourEntry];
        updatedBespokeFlours = adjustPercentages(updatedBespokeFlours);
        setBespokeFlours(updatedBespokeFlours);
    };

    const removeBespokeFlour = (flourIndexToRemove) => {
        if (bespokeFlours.length <= 1 && customizeFlourMix) {
            setCustomizeFlourMix(false); // Toggle off if removing the last custom flour
            return;
        }
        let newBespokeFlours = bespokeFlours.filter((_, idx) => idx !== flourIndexToRemove);
        if (newBespokeFlours.length === 0 && customizeFlourMix) {
            setCustomizeFlourMix(false); // Should be caught above, but as a safeguard
            return;
        }
        newBespokeFlours = adjustPercentages(newBespokeFlours);
        setBespokeFlours(newBespokeFlours);
    };

    const isBulkFermentSFStep = step.step_id === bulkFermentStepId;
    const isLevainTypeStep = step.step_id === levainStepId || step.step_type === LEVAIN_BUILD_STEP_NAME;
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

    const handleInfoClickInternal = (termKey, stepName = '') => {
        const prompt = getGenAiPrompt(termKey, stepName);
        console.log("GenAI Prompt for:", termKey, "-", prompt);
    };

    const renderInfoButton = (termKey, termDisplayName) => (
        <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
                e.stopPropagation();
                handleInfoClickInternal(termKey, termDisplayName);
            }}
            title={`Get AI explanation for ${termDisplayName || termKey.replace(/_/g, ' ')}`}
            className={`btn btn-icon btn-small ${styles.infoButton}`}
            aria-label={`Get explanation for ${termDisplayName || termKey.replace(/_/g, ' ')}`}
        >
            ⓘ
        </button>
    );

    const shouldShowInfoForStepName = (name) => {
        const notableStepNames = [LEVAIN_BUILD_STEP_NAME, 'Autolyse', 'Bulk Fermentation with Stretch and Fold', 'Proofing', 'Baking'];
        return notableStepNames.includes(name);
    };
    const getTermKeyForStepName = (name) => {
        if (name === LEVAIN_BUILD_STEP_NAME) return 'step_name_levain_build';
        if (name === 'Autolyse') return 'autolyse';
        if (name === 'Bulk Fermentation with Stretch and Fold') return 'bulk_fermentation_sf';
        if (name === 'Proofing') return 'proofing';
        if (name === 'Baking') return 'baking';
        return name;
    };
    
    const selectId = `step-type-select-${index}`;
    const customizeFlourCheckboxId = `customize-flour-mix-${index}`;

    return (
        <div className={styles.stepItemEditor}>
            <div className={styles.stepHeader}>
                {/* ... (Existing JSX for drag handle, step type select, remove button - No changes) ... */}
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
                    {shouldShowInfoForStepName(step.step_name) && renderInfoButton(getTermKeyForStepName(step.step_name), step.step_name)}
                </h4>
                {!isInTemplateMode && (
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
            
            {/* Standard Step Fields - Your existing logic for these should remain */}
            {isBulkFermentSFStep ? (
                <>
                    {/* Bulk Ferment Specific Fields */}
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-total-bulk-time-${index}`}>Total Bulk Time (mins): {renderInfoButton('total_bulk_time', 'Total Bulk Time')}</label>
                        <input type="number" id={`step-total-bulk-time-${index}`} name={`step-total-bulk-time-${index}`} placeholder="e.g., 240" value={step.duration_override ?? ''} onChange={(e) => handleNumericFieldChange('duration_override', e.target.value)} disabled={fieldsDisabled} />
                    </div>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-sf-interval-${index}`}>S&F Interval (mins): {renderInfoButton('sf_interval', 'S&F Interval')}</label>
                        <input type="number" id={`step-sf-interval-${index}`} name={`step-sf-interval-${index}`} placeholder="e.g., 30" value={step.stretch_fold_interval_minutes ?? ''} onChange={(e) => handleNumericFieldChange('stretch_fold_interval_minutes', e.target.value)} disabled={fieldsDisabled} />
                    </div>
                </>
            ) : (
                <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                    <label htmlFor={`step-duration-${index}`}>Duration (mins): {!isLevainTypeStep && renderInfoButton('step_duration', 'Step Duration')}</label>
                    <input type="number" id={`step-duration-${index}`} name={`step-duration-${index}`} placeholder="e.g., 60" value={step.duration_override ?? ''} onChange={(e) => handleNumericFieldChange('duration_override', e.target.value)} disabled={fieldsDisabled} />
                </div>
            )}
            <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                <label htmlFor={`step-temp-${index}`}>Temp (°C): {renderInfoButton('step_temperature', 'Step Temperature')}</label>
                <input type="number" id={`step-temp-${index}`} name={`step-temp-${index}`} placeholder="e.g., 24" value={step.target_temperature_celsius ?? ''} onChange={(e) => handleFloatFieldChange('target_temperature_celsius', e.target.value)} disabled={fieldsDisabled} />
            </div>
            {isLevainTypeStep && (
                <>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-levain-contrib-${index}`}>Levain Contrib. (%): {renderInfoButton('levain_contribution_pct', 'Levain Contribution %')}</label>
                        <input type="number" id={`step-levain-contrib-${index}`} name={`step-levain-contrib-${index}`} placeholder="e.g., 20" value={step.contribution_pct ?? ''} onChange={(e) => handleFloatFieldChange('contribution_pct', e.target.value)} disabled={fieldsDisabled} />
                    </div>
                    <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                        <label htmlFor={`step-levain-hydra-${index}`}>Levain Hydration (%): {renderInfoButton('levain_target_hydration', 'Levain Hydration %')}</label>
                        <input type="number" id={`step-levain-hydra-${index}`} name={`step-levain-hydra-${index}`} placeholder="e.g., 100" value={step.target_hydration ?? ''} onChange={(e) => handleFloatFieldChange('target_hydration', e.target.value)} disabled={fieldsDisabled} />
                    </div>
                </>
            )}

            {/* Flour Customization Section */}
            {isPrefermentOrMainMix && !isInTemplateMode && (
                <div className={styles.stageIngredientsSection}>
                    <h5>
                        Flour Mix for this Step
                        {renderInfoButton('flour_mix_customization', 'Flour Mix Customization')}
                    </h5>
                    <div className={`${styles.inputGroup} ${styles.checkboxGroup}`}>
                        <input
                            type="checkbox"
                            id={customizeFlourCheckboxId}
                            name={customizeFlourCheckboxId}
                            checked={customizeFlourMix}
                            onChange={handleCustomizeFlourToggle}
                            disabled={fieldsDisabled || !availableIngredients || availableIngredients.filter(ing => !ing.is_wet && ing.ingredient_name?.toLowerCase() !== 'salt').length === 0}
                        />
                        <label htmlFor={customizeFlourCheckboxId} style={{marginBottom: 0, marginLeft: 'var(--spacing-sm)'}}>Customize Flour Mix</label>
                    </div>

                    {customizeFlourMix && (
                        <div className={styles.bespokeFloursContainer}>
                            {bespokeFlours.map((flour, flourIdx) => (
                                <div key={flour.temp_ui_id || `bespoke-flour-${index}-${flourIdx}`} className={styles.ingredientRow}>
                                    <select
                                        id={`bespoke-flour-id-${index}-${flourIdx}`}
                                        name={`bespoke-flour-id-${index}-${flourIdx}`}
                                        value={flour.ingredient_id || ''}
                                        onChange={(e) => handleBespokeFlourChange(flourIdx, 'ingredient_id', e.target.value)}
                                        disabled={fieldsDisabled}
                                        className={styles.ingredientSelect}
                                    >
                                        <option value="">-- Select Flour --</option>
                                        {(availableIngredients || [])
                                            .filter(ing => !ing.is_wet && ing.ingredient_name?.toLowerCase() !== 'salt')
                                            .map(ing => (
                                                <option key={ing.ingredient_id} value={ing.ingredient_id}>
                                                    {ing.ingredient_name}
                                                </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        id={`bespoke-flour-pct-${index}-${flourIdx}`}
                                        name={`bespoke-flour-pct-${index}-${flourIdx}`}
                                        className={styles.percentageInput}
                                        value={flour.percentage == null || isNaN(flour.percentage) ? '' : flour.percentage}
                                        onChange={(e) => handleBespokeFlourChange(flourIdx, 'percentage', e.target.value)}
                                        // Disable percentage input for the last flour if more than one flour
                                        disabled={fieldsDisabled || (bespokeFlours.length > 1 && flourIdx === bespokeFlours.length - 1)}
                                        min="0"
                                        // max="100" // Max is implicitly handled by sum to 100
                                        step="0.1"
                                    />
                                     <span style={{marginLeft: '-var(--spacing-sm)', marginRight: 'var(--spacing-sm)'}}>%</span>
                                    {bespokeFlours.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeBespokeFlour(flourIdx)}
                                            disabled={fieldsDisabled}
                                            className="btn btn-icon btn-danger btn-small"
                                            title="Remove this flour"
                                            aria-label="Remove this flour"
                                        >
                                            &times;
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addBespokeFlour}
                                disabled={fieldsDisabled || !availableIngredients || availableIngredients.filter(ing => !ing.is_wet && ing.ingredient_name?.toLowerCase() !== 'salt').length <= bespokeFlours.length}
                                className="btn btn-secondary btn-small"
                                style={{ marginTop: 'var(--spacing-sm)'}}
                            >
                                Add Another Flour
                            </button>
                        </div>
                    )}
                     {!customizeFlourMix && (
                        <p style={{fontSize: 'var(--font-size-small)', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)'}}>
                            Using default flour (100% {
                                (availableIngredients.find(ing => ing.ingredient_id === DEFAULT_BREAD_FLOUR_ID && !ing.is_wet) || availableIngredients.find(ing => !ing.is_wet))?.ingredient_name || 'Default Flour'
                            }).
                        </p>
                    )}
                </div>
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