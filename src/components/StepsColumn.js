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
    availableIngredients, // <<< NEW PROP from RecipeCalculator
    onStepChange,
    onDeleteStep,
    onAddStep,
    onDragEnd,
    isLoadingPredefinedSteps, // This prop might represent combined loading state from RecipeCalculator
    isSaving,
    // Specific step type IDs to be passed to StepEditor
    levainStepId,
    bulkFermentStepId,
    mixFinalDoughStepId, // <<< NEW PROP from RecipeCalculator
    poolishBuildStepId,  // <<< NEW PROP from RecipeCalculator
    bigaBuildStepId,     // <<< NEW PROP from RecipeCalculator
    // ... any other specific step type IDs you might have ...
    isInTemplateMode,
    getStepDnDId
}) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const addStepButtonText = () => {
        // isLoadingPredefinedSteps might now cover loading of ingredients too if combined in RecipeCalculator
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
                        {isLoadingPredefinedSteps && ( // This could be a combined loading state
                            <p className={styles.loadingMessage}>Loading essential data...</p>
                        )}
                        {recipeSteps.map((step, index) => {
                            return (
                                <SortableStepItem key={getStepDnDId(step)} id={getStepDnDId(step)}>
                                    <StepEditor
                                        step={step}
                                        index={index}
                                        predefinedSteps={predefinedSteps}
                                        availableIngredients={availableIngredients} // <<< PASSING PROP
                                        onStepChange={onStepChange}
                                        onDeleteStep={onDeleteStep}
                                        isSaving={isSaving}
                                        isInTemplateMode={isInTemplateMode}
                                        // Pass all relevant step IDs
                                        levainStepId={levainStepId}
                                        bulkFermentStepId={bulkFermentStepId}
                                        mixFinalDoughStepId={mixFinalDoughStepId} // <<< PASSING PROP
                                        poolishBuildStepId={poolishBuildStepId}   // <<< PASSING PROP
                                        bigaBuildStepId={bigaBuildStepId}       // <<< PASSING PROP
                                        // ... pass other specific step IDs ...
                                        dndListeners={undefined} // Listeners are passed to SortableStepItem which handles it
                                    />
                                </SortableStepItem>
                            );
                        })}
                        {!isInTemplateMode && (
                            <button
                                type="button"
                                onClick={onAddStep}
                                disabled={isLoadingPredefinedSteps || (predefinedSteps && predefinedSteps.length === 0) || isSaving || (availableIngredients && availableIngredients.length === 0 && !isLoadingPredefinedSteps) }
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