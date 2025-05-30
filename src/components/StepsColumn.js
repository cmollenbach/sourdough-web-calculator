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

function StepsColumn({
    recipeSteps,
    predefinedSteps,
    onStepChange,
    onDeleteStep, // This is the prop passed from RecipeCalculator
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

    // DEBUG: Check the onDeleteStep prop when StepsColumn renders or re-renders
    // This might log many times if recipeSteps changes often.
    // console.log('StepsColumn: onDeleteStep prop is type:', typeof onDeleteStep);


    const addStepButtonText = () => {
        if (isLoadingPredefinedSteps) return 'Loading types...';
        if (predefinedSteps.length === 0 && !isLoadingPredefinedSteps) return 'No Step Types Loaded';
        return '⊕ Add Step';
    };

    return (
        <div className={styles.stepsColumn}>
            <h3>Recipe Steps</h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={recipeSteps.map(s => getStepDnDId(s))} strategy={verticalListSortingStrategy}>
                    <div className={styles.stepsManagementSection}>
                        {isLoadingPredefinedSteps && <p className={styles.loadingMessage}>Loading step types...</p>}
                        {recipeSteps.map((step, index) => {
                            // DEBUG: Check the onDeleteStep prop specifically where it's passed to StepEditor
                            if (index === 0) { // Log only for the first item to avoid flooding console, or remove condition for all
                                console.log(`StepsColumn mapping step "${step.step_name}": onDeleteStep prop passed to StepEditor is type:`, typeof onDeleteStep);
                            }
                            return (
                                <SortableStepItem key={getStepDnDId(step)} id={getStepDnDId(step)}>
                                    <StepEditor
                                        step={step}
                                        index={index}
                                        predefinedSteps={predefinedSteps}
                                        onStepChange={onStepChange}
                                        onDeleteStep={onDeleteStep} // Prop being passed
                                        isSaving={isSaving}
                                        isInTemplateMode={isInTemplateMode}
                                        bulkFermentStepId={bulkFermentStepId}
                                        levainStepId={levainStepId}
                                        // getStepDnDId is not directly used by StepEditor, but by SortableStepItem
                                    />
                                </SortableStepItem>
                            );
                        })}
                        {!isInTemplateMode && (
                            <button
                                type="button"
                                onClick={onAddStep}
                                disabled={isLoadingPredefinedSteps || predefinedSteps.length === 0 || isSaving}
                                className="btn btn-secondary buttonWithSpinner"
                                style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}
                            >
                                {addStepButtonText()}
                                {isSaving && <span className="buttonSpinner"></span>}
                            </button>
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}

export default StepsColumn;