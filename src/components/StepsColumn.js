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
    availableIngredients,
    onStepChange,
    onDeleteStep,
    onAddStep,
    onDragEnd,
    isLoadingPredefinedSteps,
    isSaving,
    levainStepId,
    bulkFermentStepId,
    mixFinalDoughStepId,
    poolishBuildStepId,
    bigaBuildStepId,
    soakerPrepStepId,
    scaldPrepStepId,
    isInTemplateMode,
    getStepDnDId,
    onFlourMixChange,
}) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

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
                        {isLoadingPredefinedSteps && (
                            <p className={styles.loadingMessage}>Loading essential data...</p>
                        )}
                        {recipeSteps.map((step, index) => {
                            return (
                                <SortableStepItem key={getStepDnDId(step)} id={getStepDnDId(step)}>
                                    <StepEditor
                                        step={step}
                                        index={index}
                                        predefinedSteps={predefinedSteps}
                                        availableIngredients={availableIngredients}
                                        onStepChange={onStepChange}
                                        onDeleteStep={onDeleteStep}
                                        isSaving={isSaving}
                                        isInTemplateMode={isInTemplateMode}
                                        levainStepId={levainStepId}
                                        bulkFermentStepId={bulkFermentStepId}
                                        mixFinalDoughStepId={mixFinalDoughStepId}
                                        poolishBuildStepId={poolishBuildStepId}
                                        bigaBuildStepId={bigaBuildStepId}
                                        dndListeners={undefined}
                                        onFlourMixChange={onFlourMixChange}
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