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

export default function StepsColumn({
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
    mixFinalDoughStepId,
    bulkFermentStepId,
    poolishBuildStepId,
    bigaBuildStepId,
    soakerPrepStepId,
    scaldPrepStepId,
    isInTemplateMode,
    getStepDnDId,
    onFlourMixChange,
    recipe,
    isSimplifiedViewActive,
    setIsSimplifiedViewActive,
}) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const visibleSteps = isSimplifiedViewActive
        ? recipeSteps.filter(step => !step.is_advanced)
        : recipeSteps;

    console.log('recipeSteps', recipeSteps);
    console.log('visibleSteps', visibleSteps);

    return (
        <div className={styles.stepsColumn}>
            <h3>Recipe Steps</h3>
            <div style={{ marginBottom: '1em' }}>
                <label>
                    <input
                        type="checkbox"
                        checked={!isSimplifiedViewActive}
                        onChange={e => setIsSimplifiedViewActive(!e.target.checked)}
                        style={{ marginRight: '0.5em' }}
                    />
                    High Complexity
                </label>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={visibleSteps.map(s => getStepDnDId(s))} strategy={verticalListSortingStrategy}>
                    <div className={styles.stepsManagementSection}>
                        {isLoadingPredefinedSteps && (
                            <p className={styles.loadingMessage}>Loading essential data...</p>
                        )}
                        {visibleSteps.map((step, index) => {
                            const key = step.recipe_step_id || step.temp_client_id || step.step_id || index;
                            return (
                                <SortableStepItem key={key} id={key}>
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
                                        mixFinalDoughStepId={mixFinalDoughStepId}
                                        bulkFermentStepId={bulkFermentStepId}
                                        poolishBuildStepId={poolishBuildStepId}
                                        bigaBuildStepId={bigaBuildStepId}
                                        soakerPrepStepId={soakerPrepStepId}
                                        scaldPrepStepId={scaldPrepStepId}
                                        onFlourMixChange={onFlourMixChange}
                                        recipe={recipe}
                                        isSimplifiedViewActive={isSimplifiedViewActive}
                                        setIsSimplifiedViewActive={setIsSimplifiedViewActive}
                                    />
                                </SortableStepItem>
                            );
                        })}
                        {!isInTemplateMode && (
                            <button
                                type="button"
                                onClick={onAddStep}
                                disabled={
                                    isLoadingPredefinedSteps ||
                                    (predefinedSteps && predefinedSteps.length === 0) ||
                                    isSaving ||
                                    (availableIngredients && availableIngredients.length === 0 && !isLoadingPredefinedSteps)
                                }
                                className="btn btn-secondary buttonWithSpinner"
                                style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}
                            >
                                {isLoadingPredefinedSteps
                                    ? 'Loading types...'
                                    : (predefinedSteps.length === 0 && !isLoadingPredefinedSteps)
                                        ? 'No Step Types Loaded'
                                        : '⊕ Add Step'}
                                {isSaving && <span className="buttonSpinner"></span>}
                            </button>
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}