// src/components/StepsColumn.js
import React from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableStepItem } from './SortableStepItem';
import StepEditor from './StepEditor';
import styles from './RecipeCalculator.module.css';

/**
 * @param {object} props
 * @param {Array<object>} props.recipeSteps
 * @param {Array<object>} props.predefinedSteps
 * @param {function(number, string, any): void} props.onStepChange
 * @param {function(number): void} props.onDeleteStep
 * @param {function(): void} props.onAddStep
 * @param {function(any): void} props.onDragEnd
 * @param {boolean} props.isLoadingPredefinedSteps
 * @param {boolean} props.isSaving
 * @param {string | null} props.bulkFermentStepId
 * @param {string | null} props.levainStepId
 * @param {function(object): string} props.getStepDnDId
 * @param {boolean} props.isInTemplateMode
 */
function StepsColumn({
    recipeSteps,
    predefinedSteps,
    onStepChange,
    onDeleteStep,
    onAddStep,
    onDragEnd,
    isLoadingPredefinedSteps,
    isSaving,
    bulkFermentStepId,
    levainStepId,
    isInTemplateMode,
    getStepDnDId
}) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const addStepButtonText = () => {
        if (isLoadingPredefinedSteps) return 'Loading types...';
        if (predefinedSteps.length === 0 && !isLoadingPredefinedSteps) return 'No Step Types Loaded';
        return '⊕ Add Step'; // Unicode plus icon
    };

    return (
        <div className={styles.stepsColumn}>
            <h3>Recipe Steps</h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={recipeSteps.map(s => getStepDnDId(s))} strategy={verticalListSortingStrategy}>
                    <div className={styles.stepsManagementSection}>
                        {isLoadingPredefinedSteps && <p className={styles.loadingMessage}>Loading step types...</p>}
                        {recipeSteps.map((step, index) => (
                            <SortableStepItem key={getStepDnDId(step)} id={getStepDnDId(step)}>
                                <StepEditor
                                    step={step}
                                    index={index}
                                    predefinedSteps={predefinedSteps}
                                    onStepChange={onStepChange}
                                    onDeleteStep={onDeleteStep}
                                    isSaving={isSaving}
                                    isInTemplateMode={isInTemplateMode} // Propagated
                                    bulkFermentStepId={bulkFermentStepId}
                                    levainStepId={levainStepId}
                                />
                            </SortableStepItem>
                        ))}
                        {/* Updated: Conditionally render the "Add Step" button; hide in template mode */}
                        {!isInTemplateMode && (
                            <button
                                type="button"
                                onClick={onAddStep}
                                disabled={isLoadingPredefinedSteps || predefinedSteps.length === 0 || isSaving} // Disabled only by other conditions
                                className={`${styles.addStepButton} ${styles.buttonWithSpinner}`}
                            >
                                {addStepButtonText()}
                                {isSaving && <span className={styles.buttonSpinner}></span>}
                            </button>
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}

export default StepsColumn;