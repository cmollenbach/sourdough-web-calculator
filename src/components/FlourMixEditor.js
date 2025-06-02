import React, { useEffect, useState } from 'react';
import styles from './RecipeCalculator.module.css';
import InfoButton from './InfoButton';
import Modal from './common/Modal';

function FlourMixEditor({
    customizeFlourMix,
    setCustomizeFlourMix,
    flours, // This should be step.stageIngredients from parent
    setFlours, // This should update step.stageIngredients in parent
    availableIngredients,
    fieldsDisabled,
    customizeFlourCheckboxId,
    DEFAULT_BREAD_FLOUR_ID,
    renderInfoButton,
    onFlourMixChange,
    stepId,
}) {
    const [infoModal, setInfoModal] = useState({ open: false, title: '', content: '' });

    const flourOptions = (availableIngredients || []).filter(
        ing => !ing.is_wet && ing.ingredient_name?.toLowerCase() !== 'salt'
    );

    // Handler: Toggle customize flour mix
    const handleCustomizeFlourToggle = () => {
        setCustomizeFlourMix(!customizeFlourMix);

        if (!customizeFlourMix) {
            // Find Bread Flour by ID
            const breadFlour = flourOptions.find(
                ing => ing.ingredient_id === DEFAULT_BREAD_FLOUR_ID
            );
            if (breadFlour) {
                setFlours([
                    {
                        ingredient_id: breadFlour.ingredient_id,
                        percentage: 100,
                        is_wet: false,
                        temp_ui_id: Date.now() + Math.random(),
                    },
                ]);
                if (onFlourMixChange && stepId != null) {
                    onFlourMixChange(stepId, [
                        {
                            ingredient_id: breadFlour.ingredient_id,
                            percentage: 100,
                            is_wet: false,
                            temp_ui_id: Date.now() + Math.random(),
                        },
                    ]);
                }
            }
        } else if (flours.length === 1) {
            setFlours([{ ...flours[0], percentage: 100 }]);
        }
    };

    // Handler: Change flour or percentage
    const handleFlourChange = (idx, field, value) => {
        let updated = flours.map((flour, i) =>
            i === idx ? { ...flour, [field]: field === 'percentage' ? parseFloat(value) : value } : flour
        );

        if (field === 'percentage') {
            let pct = parseFloat(value) || 0;
            const lastIdx = flours.length - 1;

            if (flours.length > 1 && idx !== lastIdx) {
                // Calculate the sum of all other flours except the last and the one being edited
                const sumOther = updated.reduce((sum, f, i) =>
                    i !== idx && i !== lastIdx ? sum + (parseFloat(f.percentage) || 0) : sum, 0
                );
                // Clamp so last flour never goes below zero
                pct = Math.max(0, Math.min(100 - sumOther, pct));
                updated[idx].percentage = pct;
                updated[lastIdx] = {
                    ...updated[lastIdx],
                    percentage: Math.max(0, 100 - sumOther - pct)
                };
            } else if (flours.length > 1 && idx === lastIdx) {
                // If editing the last flour, just clamp to what's left
                const sumOther = updated.reduce((sum, f, i) =>
                    i !== lastIdx ? sum + (parseFloat(f.percentage) || 0) : sum, 0
                );
                pct = Math.max(0, Math.min(100 - sumOther, pct));
                updated[lastIdx].percentage = pct;
            } else {
                // Only one flour
                updated[idx].percentage = 100;
            }
        }

        setFlours(updated);
        if (onFlourMixChange && stepId != null) {
            onFlourMixChange(stepId, updated);
        }
    };

    // Handler: Add another flour
    const addFlour = () => {
        const unusedFlour = flourOptions.find(
            fo => !flours.some(bf => bf.ingredient_id === fo.ingredient_id)
        );
        if (unusedFlour) {
            const newFlours = [
                ...flours,
                {
                    ingredient_id: unusedFlour.ingredient_id,
                    percentage: 0,
                    is_wet: false,
                    temp_ui_id: Date.now() + Math.random(),
                },
            ];
            setFlours(newFlours);
            if (onFlourMixChange && stepId != null) {
                onFlourMixChange(stepId, newFlours);
            }
        }
    };

    // Handler: Remove a flour
    const removeFlour = idx => {
        const updated = flours.filter((_, i) => i !== idx);
        setFlours(updated);
        if (onFlourMixChange && stepId != null) {
            onFlourMixChange(stepId, updated);
        }
        adjustPercentages(updated);
    };

    // Adjust percentages so they sum to 100
    const adjustPercentages = updatedFlours => {
        const total = updatedFlours.reduce((sum, f) => sum + (f.percentage || 0), 0);
        if (total !== 100 && updatedFlours.length > 0) {
            // Optionally, normalize percentages here if you want
        }
    };

    const defaultFlourName =
        (availableIngredients.find(
            ing => ing.ingredient_id === DEFAULT_BREAD_FLOUR_ID && !ing.is_wet
        ) ||
            availableIngredients.find(ing => !ing.is_wet))?.ingredient_name || 'Default Flour';

    const handleInfoClick = (title, content) => {
        setInfoModal({ open: true, title, content });
    };

    return (
        <div className={styles.stageIngredientsSection}>
            <div className={styles.flourMixHeaderRow}>
                <label htmlFor={customizeFlourCheckboxId} className={styles.flourMixHeaderLabel}>
                    Custom flour mix
                    <InfoButton
                        termKey="flour_mix_customization"
                        termDisplayName="Flour Mix Customization"
                        onClick={handleInfoClick}
                        className={styles.infoButton}
                    />
                </label>
                <input
                    type="checkbox"
                    id={customizeFlourCheckboxId}
                    name={customizeFlourCheckboxId}
                    checked={customizeFlourMix}
                    onChange={handleCustomizeFlourToggle}
                    disabled={fieldsDisabled || flourOptions.length === 0}
                    className={styles.flourMixCheckbox}
                />
            </div>
            {customizeFlourMix && (
                <div className={styles.bespokeFloursContainer}>
                    {flours.map((flour, flourIdx) => (
                        <div key={flour.temp_ui_id || `flour-${flourIdx}`} className={styles.ingredientRow}>
                            <select
                                id={`flour-id-${flourIdx}`}
                                name={`flour-id-${flourIdx}`}
                                value={flour.ingredient_id || ''}
                                onChange={e => handleFlourChange(flourIdx, 'ingredient_id', e.target.value)}
                                disabled={fieldsDisabled}
                                className={styles.flourSelect}
                            >
                                <option value="">-- Select Flour --</option>
                                {flourOptions.map(ing => (
                                    <option key={ing.ingredient_id} value={ing.ingredient_id}>
                                        {ing.ingredient_name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                className={styles.inputNumberCompact}
                                id={`flour-pct-${flourIdx}`}
                                name={`flour-pct-${flourIdx}`}
                                value={flour.percentage == null || isNaN(flour.percentage) ? '' : flour.percentage}
                                onChange={e => handleFlourChange(flourIdx, 'percentage', e.target.value)}
                                disabled={fieldsDisabled || (flours.length > 1 && flourIdx === flours.length - 1)}
                                min="0"
                                max={100}
                                step={1}
                            />
                            <span style={{marginLeft: '-var(--spacing-sm)', marginRight: 'var(--spacing-sm)'}}>%</span>
                            {flours.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeFlour(flourIdx)}
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
                        onClick={addFlour}
                        disabled={fieldsDisabled || flourOptions.length <= flours.length}
                        className="btn btn-secondary btn-small"
                        style={{ marginTop: 'var(--spacing-sm)'}}
                    >
                        Add Another Flour
                    </button>
                </div>
            )}
            {!customizeFlourMix && (
                <p style={{fontSize: 'var(--font-size-small)', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)'}}>
                    Using default flour (100% {defaultFlourName}).
                </p>
            )}
            {infoModal.open && (
                <Modal
                    isOpen={infoModal.open}
                    onClose={() => setInfoModal({ ...infoModal, open: false })}
                    title={infoModal.title}
                >
                    <div>{infoModal.content}</div>
                </Modal>
            )}
        </div>
    );
}

export default FlourMixEditor;