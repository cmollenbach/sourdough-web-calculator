// src/RecipeCalculator.js
import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import RecipeFields from './components/RecipeFields';
import RecipeManagementActions from './components/RecipeManagementActions';
import RecipeResults from './components/RecipeResults';
import StepsColumn from './components/StepsColumn';
import BaseTemplates from './components/BaseTemplates';
import Modal from './components/common/Modal';
import { arrayMove } from '@dnd-kit/sortable';
import { assignStageIngredientsToSteps } from './utils/recipeUtils';

import { DEFAULT_BREAD_FLOUR_ID } from './constants/recipeConstants';
import styles from './components/RecipeCalculator.module.css';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import { useToast } from './contexts/ToastContext';
import { useActiveBakes } from './contexts/ActiveBakesContext';

import {
    INITIAL_RECIPE_FIELDS,
} from './constants/recipeConstants';

import {
    normalizeStepFlours,
    calculateRecipe,
    processRecipeSteps,
    getStepDnDId,
    normalizeRecipeStepsForSave
} from './utils/recipeUtils';
import RecipeService from './services/RecipeService';
import { AuthError } from './services/AuthError';

const initialState = {
    ...INITIAL_RECIPE_FIELDS,
    steps: [],
    currentRecipeId: null,
    selectedRecipeToLoad: '',
    isInTemplateMode: false,
    activeTemplateId: null,
    feedbackMessage: { type: '', text: '' },
    baseRecipeTemplates: [],
    isLoadingBaseTemplates: false,
    savedRecipes: [],
    isLoadingRecipes: false,
    isSaving: false,
};

// IDs for special steps
const LEVAIN_BUILD_STEP_ID = 1;
const MIX_FINAL_DOUGH_STEP_ID = 3;

function recipeReducer(state, action) {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.payload };
        case 'SET_RECIPE_FIELD':
            return { ...state, [action.field]: action.payload, feedbackMessage: { type: '', text: '' } };
        case 'SET_FULL_RECIPE_FORM': {
            const { predefinedSteps, recipeData } = action.payload;
            const processedSteps = (recipeData.steps || []).map((step, index) => ({
                ...step,
                stageIngredients: Array.isArray(step.stageIngredients) ? step.stageIngredients : [],
                temp_client_id: step.recipe_step_id ? null : (step.temp_client_id || Date.now() + index + Math.random()),
            }));
            const fullyProcessedSteps = processRecipeSteps(processedSteps, predefinedSteps);

            return {
                ...state,
                recipe_name: recipeData.recipe_name,
                description: recipeData.description,
                targetDoughWeight: String(recipeData.targetDoughWeight),
                hydrationPercentage: String(recipeData.hydrationPercentage),
                saltPercentage: String(parseFloat(recipeData.saltPercentage).toFixed(1)),
                steps: fullyProcessedSteps,
                currentRecipeId: recipeData.recipe_id || null,
                selectedRecipeToLoad: String(recipeData.recipe_id || ''),
                isInTemplateMode: false,
                activeTemplateId: null,
                feedbackMessage: { type: '', text: '' },
            };
        }
        case 'SET_LOADING':
            return { ...state, [action.field]: action.payload };
        case 'SET_FEEDBACK':
            return { ...state, feedbackMessage: action.payload };
        case 'CLEAR_FEEDBACK':
            return { ...state, feedbackMessage: { type: '', text: '' } };
        case 'SET_BASE_RECIPE_TEMPLATES':
            const templatesWithStageIngredients = (action.payload || []).map(template => ({
                ...template,
                steps: (template.steps || []).map(step => ({
                    ...step,
                    stageIngredients: Array.isArray(step.stageIngredients) ? step.stageIngredients : [],
                }))
            }));
            return { ...state, baseRecipeTemplates: templatesWithStageIngredients, isLoadingBaseTemplates: false };
        case 'SET_LOADING_BASE_TEMPLATES':
            return { ...state, isLoadingBaseTemplates: action.payload };
        case 'LOAD_TEMPLATE_DATA': {
            const templateData = action.payload.template;
            const { predefinedSteps } = action.additionalData;
            const finalProcessedSteps = (templateData.steps || []).map((rawStep, index) => {
                const predefined = predefinedSteps.find(ps => ps.step_id === rawStep.step_id);
                return {
                    ...rawStep,
                    step_name: rawStep.step_name || (predefined ? predefined.step_name : `Unknown Step ID ${rawStep.step_id}`),
                    notes: rawStep.notes || (predefined ? predefined.description : '') || '',
                    stageIngredients: Array.isArray(rawStep.stageIngredients) ? rawStep.stageIngredients : [],
                    recipe_step_id: undefined,
                    temp_client_id: Date.now() + index + Math.random() + '_template_step',
                    step_order: rawStep.step_order || index + 1,
                    timingRelationType: rawStep.timingRelationType || rawStep.timing_relation_type || 'after_previous_completes',
                };
            });
            return {
                ...state,
                recipe_name: templateData.recipe_name ? `${templateData.recipe_name} (Copy)` : 'New Recipe from Template',
                description: templateData.description || '',
                targetDoughWeight: String(templateData.targetDoughWeight || INITIAL_RECIPE_FIELDS.targetDoughWeight),
                hydrationPercentage: String(templateData.hydrationPercentage || INITIAL_RECIPE_FIELDS.hydrationPercentage),
                saltPercentage: String(parseFloat(templateData.saltPercentage || INITIAL_RECIPE_FIELDS.saltPercentage).toFixed(1)),
                steps: finalProcessedSteps,
                currentRecipeId: null, selectedRecipeToLoad: '',
                isInTemplateMode: true, activeTemplateId: templateData.recipe_id,
                feedbackMessage: { type: '', text: '' },
            };
        }
        case 'CLEAR_FORM': {
            // Always start with Build Levain and Mix Final Dough
            const initialSteps = normalizeStepFlours([
                {
                    step_id: LEVAIN_BUILD_STEP_ID,
                    step_type: 'Levain',
                    step_name: 'Levain Build',
                    stageIngredients: [],
                    step_order: 1,
                },
                {
                    step_id: MIX_FINAL_DOUGH_STEP_ID,
                    step_type: 'Mixing',
                    step_name: 'Mix Final Dough',
                    stageIngredients: [],
                    step_order: 2,
                }
            ], DEFAULT_BREAD_FLOUR_ID);
            return {
                ...state,
                ...INITIAL_RECIPE_FIELDS,
                saltPercentage: parseFloat(INITIAL_RECIPE_FIELDS.saltPercentage || 0).toFixed(1),
                steps: initialSteps,
                currentRecipeId: null,
                selectedRecipeToLoad: '',
                isInTemplateMode: false,
                activeTemplateId: null,
                feedbackMessage: { type: '', text: '' },
            };
        }
        case 'UPDATE_STEP': {
            const { index, payload } = action;
            return {
                ...state,
                steps: state.steps.map((step, i) => i === index ? { ...step, ...payload } : step)
            };
        }
        case 'ADD_STEP': {
            const newStep = {
                step_id: '', // blank until user selects
                temp_client_id: Date.now() + Math.random(),
                step_type: '',
                step_name: '',
                stageIngredients: [],
                step_order: state.steps.length + 1,
            };
            const steps = [...state.steps, newStep].map((step, i) => ({ ...step, step_order: i + 1 }));
            return { ...state, steps };
        }
        case 'DELETE_STEP': {
            const stepToDelete = state.steps[action.index];
            if (stepToDelete && stepToDelete.step_id === MIX_FINAL_DOUGH_STEP_ID && action.index === 1) {
                return state;
            }
            const newSteps = state.steps.filter((_, i) => i !== action.index)
                .map((step, i) => ({ ...step, step_order: i + 1 }));
            return { ...state, steps: newSteps };
        }
        case 'REORDER_STEPS': {
            const steps = action.payload.map((step, i) => ({ ...step, step_order: i + 1 }));
            return { ...state, steps };
        }
        default:
            return state;
    }
}

function RecipeCalculator({ showTemplates, forceExitTemplateMode }) {
    const [state, dispatch] = useReducer(recipeReducer, initialState);
    const { isLoadingBaseTemplates, activeTemplateId } = state;
    const [calculationResults, setCalculationResults] = useState({
        totalFlourInRecipe: 0, totalWaterInRecipe: 0, totalSaltInRecipe: 0,
        prefermentsSummary: [], mainDoughAdds: { flours: [], water: 0, salt: 0, },
        grandTotalWeight: 0, bakerPercentages: { hydration: 0, salt: 0, prefermentedFlour: 0 }, errors: [],
    });

    const navigate = useNavigate();
    const { addToast } = useToast();
    const [isStartingBake, setIsStartingBake] = useState(false);
    const { isLoggedIn, logout } = useAuth();
    const { refreshActiveBakes } = useActiveBakes();
    const {
        predefinedSteps,
        levainStepIdDynamic,
        bulkFermentStepIdDynamic,
        mixFinalDoughStepId,
        poolishBuildStepId,
        bigaBuildStepId,
        soakerPrepStepId,
        scaldPrepStepId,
        availableIngredients,
        isLoadingAvailableIngredients,
        isLoadingPredefinedSteps,
    } = useData();

    const [modalState, setModalState] = useState({ isOpen: false, title: '', content: null, actions: [] });
    const openModal = (title, content, actions = []) => setModalState({ isOpen: true, title, content, actions });
    const closeModal = () => setModalState({ isOpen: false, title: '', content: null, actions: [] });

    const clearFeedback = useCallback(() => {
        dispatch({ type: 'CLEAR_FEEDBACK' });
    }, []);
    const handleStepChange = (index, field, value) => {
        dispatch({ type: 'UPDATE_STEP', index, payload: { [field]: value } });
    };

    const handleAddStep = (stepData) => {
        dispatch({ type: 'ADD_STEP', payload: stepData });
    };

    const handleDeleteStep = (index) => {
        dispatch({ type: 'DELETE_STEP', index });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = state.steps.findIndex(step => getStepDnDId(step) === active.id);
        const newIndex = state.steps.findIndex(step => getStepDnDId(step) === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(state.steps, oldIndex, newIndex)
            .map((step, idx) => ({ ...step, step_order: idx + 1 }));

        dispatch({ type: 'REORDER_STEPS', payload: reordered });
    };
    const recipeInputFields = {
        targetDoughWeight: state.targetDoughWeight,
        hydrationPercentage: state.hydrationPercentage,
        saltPercentage: state.saltPercentage,
    };

    const handleRecipeFieldChange = (field, value) => {
        dispatch({ type: 'SET_RECIPE_FIELD', field, payload: value });
    };

    const processLoadedRecipeData = useCallback((recipeDataForProcessing) => {
        const currentPredefinedSteps = predefinedSteps || [];
        const stepsWithIngredients = (recipeDataForProcessing.steps || []).map(step => ({
            ...step,
            stageIngredients: Array.isArray(step.stageIngredients) ? step.stageIngredients : []
        }));
        const processedStepsData = processRecipeSteps(stepsWithIngredients, currentPredefinedSteps);
        return {
            ...recipeDataForProcessing,
            steps: processedStepsData,
            saltPercentage: parseFloat(recipeDataForProcessing.saltPercentage).toFixed(1)
        };
    }, [predefinedSteps]);

    const handleClearForm = useCallback(() => {
        dispatch({
            type: 'CLEAR_FORM',
            payload: { predefinedSteps: predefinedSteps || [] }
        });
        addToast("Form cleared.", "info");
    }, [predefinedSteps, addToast, dispatch]);

    const fetchUserRecipesList = useCallback(async () => {
        if (!isLoggedIn()) {
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: [] });
            return;
        }
        dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: true });
        try {
            const data = await RecipeService.getUserRecipes();
            const recipesWithProcessedSteps = (data || []).map(recipe => {
                const stepsWithIngredients = (recipe.steps || []).map(step => ({
                    ...step,
                    stageIngredients: Array.isArray(step.stageIngredients) ? step.stageIngredients : []
                }));
                return { ...recipe, steps: stepsWithIngredients }; // <-- FIXED
            });
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: recipesWithProcessedSteps });
        } catch (error) {
            console.error("RecipeCalculator: Error fetching user recipes:", error);
            if (error instanceof AuthError) {
                addToast(error.message || "Your session has expired. Please log in again.", "error");
                logout();
            } else {
                addToast(error.message || "Failed to load your recipes.", "error");
            }
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: [] });
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: false });
        }
    }, [isLoggedIn, addToast, logout]);

    useEffect(() => {
        if (isLoggedIn()) {
            fetchUserRecipesList();
        } else {
            dispatch({ type: 'SET_FIELD', field: 'savedRecipes', payload: [] });
        }
    }, [isLoggedIn, fetchUserRecipesList]);

    useEffect(() => {
        if (
            isLoggedIn() &&
            predefinedSteps && predefinedSteps.length > 0 &&
            levainStepIdDynamic &&
            !state.currentRecipeId &&
            state.steps.length === 0 &&
            !state.isInTemplateMode
        ) {
            handleClearForm();
        }
    }, [
        isLoggedIn, predefinedSteps, levainStepIdDynamic,
        state.currentRecipeId, state.steps.length, state.isInTemplateMode,
        handleClearForm
    ]);

    useEffect(() => {
        const stepTypeIdsForCalc = {
            levainBuild: levainStepIdDynamic,
            mixFinalDough: mixFinalDoughStepId,
            poolishBuild: poolishBuildStepId,
            bigaBuild: bigaBuildStepId,
            bulkFermentSF: bulkFermentStepIdDynamic,
            soakerPrep: soakerPrepStepId,
            scaldPrep: scaldPrepStepId
        };

        // Normalize before calculation
        const normalizedSteps = normalizeRecipeStepsForSave(
            state.steps,
            state.currentRecipeId,
            state.isInTemplateMode
        );

        const newResults = calculateRecipe(
            state.targetDoughWeight,
            state.hydrationPercentage,
            state.saltPercentage,
            normalizedSteps,
            availableIngredients || [],
            stepTypeIdsForCalc
        );
        setCalculationResults(newResults);
    }, [
        state.targetDoughWeight, state.hydrationPercentage, state.saltPercentage, state.steps,
        availableIngredients,
        levainStepIdDynamic, bulkFermentStepIdDynamic, mixFinalDoughStepId,
        poolishBuildStepId, bigaBuildStepId, soakerPrepStepId, scaldPrepStepId
    ]);

    const fetchBaseTemplates = useCallback(async () => {
        if (!isLoggedIn()) return;
        dispatch({ type: 'SET_LOADING_BASE_TEMPLATES', payload: true });
        try {
            const templates = await RecipeService.getBaseRecipeTemplates();
            dispatch({ type: 'SET_BASE_RECIPE_TEMPLATES', payload: templates || [] });
        } catch (error) {
            console.error("RecipeCalculator: Error fetching base recipe templates:", error);
            if (error instanceof AuthError) {
                addToast(error.message || "Session expired fetching templates. Please log in again.", "error");
                logout();
            } else {
                addToast(error.message || "Failed to load base templates.", "error");
            }
            dispatch({ type: 'SET_BASE_RECIPE_TEMPLATES', payload: [] });
        } finally {
             dispatch({ type: 'SET_LOADING_BASE_TEMPLATES', payload: false });
        }
    }, [isLoggedIn, addToast, logout, dispatch]);

    useEffect(() => {
        if(isLoggedIn()) {
            fetchBaseTemplates();
        } else {
            dispatch({ type: 'SET_BASE_RECIPE_TEMPLATES', payload: [] });
        }
    }, [isLoggedIn, fetchBaseTemplates]);

    const handleLoadRecipeChange = async (event) => {
        clearFeedback();
        const recipeIdToLoad = event.target.value;
        dispatch({ type: 'SET_FIELD', field: 'selectedRecipeToLoad', payload: recipeIdToLoad });

        if (!recipeIdToLoad) {
            handleClearForm();
            return;
        }
        dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: true });
        try {
            const recipeDataFromApi = await RecipeService.getRecipeById(recipeIdToLoad);
            const processedData = processLoadedRecipeData(recipeDataFromApi);
            dispatch({
                type: 'SET_FULL_RECIPE_FORM',
                payload: { recipeData: processedData, predefinedSteps: predefinedSteps || [] }
            });
    
            addToast(`Recipe "${processedData.recipe_name}" loaded.`, "info");
        } catch (error) {
            console.error("RecipeCalculator: Error fetching specific recipe:", error);
            if (error instanceof AuthError) {
                addToast(error.message || "Session expired. Please log in again.", "error");
                logout();
            } else {
                addToast(error.message || "Failed to load selected recipe.", "error");
            }
            dispatch({ type: 'SET_FIELD', field: 'selectedRecipeToLoad', payload: state.currentRecipeId || '' });
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isLoadingRecipes', payload: false });
        }
    };

    const handleStartGuidedBake = async () => {
        clearFeedback();
        if (!state.currentRecipeId) {
            addToast('Please load or save a recipe to start a guided bake.', "warning");
            return;
        }
        setIsStartingBake(true);
        try {
            const bakeSessionData = await RecipeService.startBake(state.currentRecipeId);
            if (bakeSessionData && bakeSessionData.bakeLogId) {
                addToast(`Guided bake for "${state.recipe_name}" started!`, "success");
                await refreshActiveBakes();
                navigate(`/bake/${bakeSessionData.bakeLogId}`, {
                    state: { initialBakeData: bakeSessionData }
                });
            } else {
                const errorMsg = bakeSessionData?.message || 'Failed to initiate bake session. Missing session ID.';
                addToast(errorMsg, "error");
            }
        } catch (err) {
            console.error("RecipeCalculator: Error starting guided bake:", err);
            if (err instanceof AuthError) {
                addToast(err.message || "Your session has expired. Please log in again.", "error");
                logout();
            } else {
                addToast(err.message || 'An unexpected error occurred while starting the bake.', "error");
            }
        } finally {
            setIsStartingBake(false);
        }
    };

    const handleLoadTemplateData = useCallback((template) => {
        clearFeedback();
        dispatch({
            type: 'LOAD_TEMPLATE_DATA',
            payload: { template: template },
            additionalData: { predefinedSteps: predefinedSteps || [], levainStepIdDynamic, bulkFermentStepIdDynamic }
        });
        addToast(`Template "${template.recipe_name}" loaded. Modify and save as new.`, "info");
    }, [predefinedSteps, levainStepIdDynamic, bulkFermentStepIdDynamic, addToast, clearFeedback, dispatch]);

    const handleSaveOrUpdateRecipe = async () => {
        clearFeedback();
        const trimmedRecipeName = state.recipe_name.trim();

        if (!trimmedRecipeName) {
            addToast('Recipe name is required.', "error"); return;
        }
        if (state.steps.length === 0) {
            addToast('At least one recipe step is required.', "error"); return;
        }

        // Centralized normalization
        const stepsForSave = normalizeRecipeStepsForSave(state.steps, state.currentRecipeId, state.isInTemplateMode);

        const recipePayload = {
            recipe_name: trimmedRecipeName,
            description: state.description,
            targetDoughWeight: parseFloat(state.targetDoughWeight),
            hydrationPercentage: parseFloat(state.hydrationPercentage),
            saltPercentage: parseFloat(state.saltPercentage),
            steps: stepsForSave,
        };

        dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: true });
        try {
            let resultMessage = '';
            let updatedRecipeDataFromApi;

            if (state.currentRecipeId && !state.isInTemplateMode) {
                await RecipeService.updateRecipe(state.currentRecipeId, recipePayload);
                resultMessage = 'Recipe updated successfully!';
                updatedRecipeDataFromApi = await RecipeService.getRecipeById(state.currentRecipeId);
            } else {
                const result = await RecipeService.saveRecipe(recipePayload);
                resultMessage = 'Recipe saved successfully!';
                updatedRecipeDataFromApi = result.recipe;
            }

            const processedData = processLoadedRecipeData(updatedRecipeDataFromApi);
            dispatch({ type: 'SET_FULL_RECIPE_FORM', payload: { recipeData: processedData, predefinedSteps: predefinedSteps || [] } });
            addToast(resultMessage, "success");
            fetchUserRecipesList();
        } catch (error) {
            console.error("RecipeCalculator: Error saving/updating recipe:", error);
            if (error instanceof AuthError) {
                addToast(error.message || "Session expired. Please log in again.", "error");
                logout();
            } else {
                addToast(error.message || "Failed to save recipe.", "error");
            }
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: false });
        }
    };

    const confirmActualDelete = async () => {
        closeModal();
        clearFeedback();
        if (!state.currentRecipeId) {
            addToast("No recipe selected for deletion.", "error");
            return;
        }
        dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: true });
        try {
            await RecipeService.deleteRecipe(state.currentRecipeId);
            addToast('Recipe deleted successfully!', "success");
            handleClearForm();
            fetchUserRecipesList();
        } catch (error) {
            console.error("RecipeCalculator: Error deleting recipe:", error);
            if (error instanceof AuthError) {
                addToast(error.message || "Session expired. Please log in again.", "error");
                logout();
            } else {
                addToast(error.message || "Failed to delete recipe.", "error");
            }
        } finally {
            dispatch({ type: 'SET_LOADING', field: 'isSaving', payload: false });
        }
    };

    const handleDeleteRecipe = () => {
        if (!state.currentRecipeId) {
            addToast('No recipe loaded to delete.', "error");
            return;
        }
        openModal(
            "Confirm Delete",
            `Are you sure you want to delete the recipe "${state.recipe_name}"? This action cannot be undone.`,
            [
                { text: "Cancel", onClick: closeModal, variant: 'secondary' },
                { text: "Delete Recipe", onClick: confirmActualDelete, variant: 'danger' }
            ]
        );
    };

    const getFeedbackClassName = () => {
        if (!state.feedbackMessage.text) return 'feedback-message hidden';
        if (state.feedbackMessage.type === 'error') return 'feedback-message feedback-message-error';
        if (state.feedbackMessage.type === 'success') return 'feedback-message feedback-message-success';
        if (state.feedbackMessage.type === 'info') return 'feedback-message feedback-message-info';
        return 'feedback-message';
    };

    useEffect(() => {
        // Only run on first mount
        handleClearForm();
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        if (forceExitTemplateMode && state.isInTemplateMode) {
            dispatch({ type: 'SET_FIELD', field: 'isInTemplateMode', payload: false });
            dispatch({ type: 'SET_FIELD', field: 'activeTemplateId', payload: null });
        }
    }, [forceExitTemplateMode, state.isInTemplateMode]);

    const handleFlourMixChange = (stepId, newFlourMix) => {
        const index = state.steps.findIndex(
            step => step.recipe_step_id === stepId || step.temp_client_id === stepId
        );
        if (index !== -1) {
            dispatch({ type: 'UPDATE_STEP', index, payload: { stageIngredients: newFlourMix } });
        }
    };

    const [isSimplifiedViewActive, setIsSimplifiedViewActive] = useState(false);

    return (
        <>
            <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title} footerActions={modalState.actions}>
                {modalState.content}
            </Modal>

            {state.feedbackMessage.text && ( <p className={getFeedbackClassName()}> {state.feedbackMessage.text} </p> )}

            {(isLoadingPredefinedSteps || isLoadingAvailableIngredients) && isLoggedIn() && (
                <p className={`feedback-message feedback-message-info ${styles.loadingMessage}`}>Loading essential data...</p>
            )}

            {showTemplates && isLoggedIn() && 
              predefinedSteps && predefinedSteps.length > 0 && 
              availableIngredients && availableIngredients.length > 0 && 
              !isLoadingPredefinedSteps && !isLoadingAvailableIngredients && (
                <BaseTemplates
                  baseRecipeTemplates={state.baseRecipeTemplates}
                  isLoadingBaseTemplates={isLoadingBaseTemplates}
                  activeTemplateId={activeTemplateId}
                  onLoadTemplateData={handleLoadTemplateData}
                  isInTemplateMode={state.isInTemplateMode}
                />
            )}

            <div className={styles.recipeCalculatorLayout}>
                <div className={styles.recipeDetailsColumn}>
                    <div className={styles.inputsSection}>
                        <h3>Inputs</h3>
                        <RecipeFields
                            recipe={recipeInputFields}
                            onFieldChange={handleRecipeFieldChange}
                            isSaving={state.isSaving}
                            clearFeedback={clearFeedback}
                            isInputsSection={true}
                            isInTemplateMode={state.isInTemplateMode}
                            isSimplifiedViewActive={isSimplifiedViewActive}
                        />
                    </div>
                    <RecipeResults results={calculationResults} />
  
                    <div className={styles.manageRecipesSection}>
                         <RecipeManagementActions
                            recipeName={state.recipe_name} description={state.description}
                            onRecipeNameChange={(value) => handleRecipeFieldChange('recipe_name', value)}
                            onDescriptionChange={(value) => handleRecipeFieldChange('description', value)}
                            savedRecipes={state.savedRecipes} selectedRecipeToLoad={state.selectedRecipeToLoad}
                            onLoadRecipeChange={handleLoadRecipeChange}
                            onSaveOrUpdate={handleSaveOrUpdateRecipe}
                            onDelete={handleDeleteRecipe} onClearForm={handleClearForm}
                            isLoadingRecipes={state.isLoadingRecipes} isSaving={state.isSaving}
                            currentRecipeId={state.currentRecipeId} clearFeedback={clearFeedback}
                            isInTemplateMode={state.isInTemplateMode}
                        />
                        {isLoggedIn() && state.currentRecipeId && !state.isInTemplateMode && (
                            <div className={styles.actionsGroup} style={{ marginTop: 'var(--spacing-lg)' }}>
                                <button
                                    onClick={handleStartGuidedBake}
                                    disabled={isStartingBake || state.isSaving}
                                    className="btn btn-primary buttonWithSpinner"
                                    style={{ width: '100%', backgroundColor: 'var(--color-success)', color: 'var(--color-text-light)' }}
                                >
                                    {isStartingBake ? 'Starting Bake...' : 'Start Guided Bake'}
                                    {isStartingBake && <span className="buttonSpinner"></span>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                <StepsColumn
                    recipeSteps={Array.isArray(state.steps) ? state.steps : []}
                    predefinedSteps={predefinedSteps || []}
                    availableIngredients={availableIngredients || []}
                    onStepChange={handleStepChange}
                    onDeleteStep={handleDeleteStep}
                    onAddStep={handleAddStep}
                    onDragEnd={handleDragEnd}
                    isLoadingPredefinedSteps={isLoadingPredefinedSteps || isLoadingAvailableIngredients}
                    isSaving={state.isSaving}
                    levainStepId={1}
                    mixFinalDoughStepId={3}
                    poolishBuildStepId={poolishBuildStepId}
                    bigaBuildStepId={bigaBuildStepId}
                    soakerPrepStepId={soakerPrepStepId}
                    scaldPrepStepId={scaldPrepStepId}
                    getStepDnDId={getStepDnDId}
                    isInTemplateMode={state.isInTemplateMode}
                    onFlourMixChange={handleFlourMixChange}
                    recipe={state}
                    isSimplifiedViewActive={isSimplifiedViewActive} 
                    setIsSimplifiedViewActive={setIsSimplifiedViewActive} 
                />
            </div>
        </>
    );
}

export default RecipeCalculator;

