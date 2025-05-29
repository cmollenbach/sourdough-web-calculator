// src/components/PublicRecipeCalculatorView.js
import React, { useState, useEffect, useCallback } from 'react';
// ... (other imports remain the same)
import RecipeService from '../services/RecipeService';
import BaseTemplates from './BaseTemplates';
import RecipeFields from './RecipeFields';
import RecipeResults from './RecipeResults';
import StepsColumn from './StepsColumn';
import styles from './RecipeCalculator.module.css';
import { INITIAL_RECIPE_FIELDS } from '../constants/recipeConstants';
import { calculateRecipe, processRecipeSteps, getStepDnDId } from '../utils/recipeUtils';

const PUBLIC_LEVAIN_STEP_ID = null;
const PUBLIC_BULK_FERMENT_STEP_ID = null;

function PublicRecipeCalculatorView() {
    // ... (state variables remain the same as your current PublicRecipeCalculatorView)
    const [baseRecipeTemplates, setBaseRecipeTemplates] = useState([]);
    const [isLoadingBaseTemplates, setIsLoadingBaseTemplates] = useState(false);
    const [activeTemplateId, setActiveTemplateId] = useState(null);
    const [currentTemplateDetails, setCurrentTemplateDetails] = useState(null);
    const [displayRecipeInputs, setDisplayRecipeInputs] = useState({
        targetDoughWeight: INITIAL_RECIPE_FIELDS.targetDoughWeight,
        hydrationPercentage: INITIAL_RECIPE_FIELDS.hydrationPercentage,
        saltPercentage: INITIAL_RECIPE_FIELDS.saltPercentage,
    });
    const [processedSteps, setProcessedSteps] = useState([]);
    const [calculationResults, setCalculationResults] = useState({
        flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0
    });
    const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });


    // ... (useEffect for fetching templates remains the same)
    useEffect(() => {
        const fetchPublicTemplates = async () => {
            setIsLoadingBaseTemplates(true);
            setFeedbackMessage({ type: '', text: '' });
            try {
                const templates = await RecipeService.getBaseRecipeTemplates(true);
                setBaseRecipeTemplates(templates || []);
                if (!templates || templates.length === 0) {
                    setFeedbackMessage({ type: 'info', text: 'No public templates available at the moment.' });
                }
            } catch (error) {
                console.error("PublicCalculator: Error fetching templates:", error);
                setFeedbackMessage({ type: 'error', text: `Failed to load templates: ${error.message}` });
                setBaseRecipeTemplates([]);
            } finally {
                setIsLoadingBaseTemplates(false);
            }
        };
        fetchPublicTemplates();
    }, []);

 const handleLoadTemplateData = useCallback((template) => {
    setCurrentTemplateDetails(template);
    setActiveTemplateId(template.recipe_id);

    setDisplayRecipeInputs({
        targetDoughWeight: String(template.targetDoughWeight || INITIAL_RECIPE_FIELDS.targetDoughWeight),
        hydrationPercentage: String(template.hydrationPercentage || INITIAL_RECIPE_FIELDS.hydrationPercentage),
        saltPercentage: String(parseFloat(template.saltPercentage || INITIAL_RECIPE_FIELDS.saltPercentage).toFixed(1)),
    });

    // --- Direct Step Processing for Public View ---
    const stepsForDisplay = (template.steps || []).map((rawStep, index) => {
        // rawStep comes from your backend's /api/templates response for each step in a template
        // It should include: step_id, step_name, duration_override, notes, etc.
        return {
            // Spread all properties from the template step first
            ...rawStep,

            // Ensure critical properties are what we expect for display
            step_id: rawStep.step_id,
            step_name: rawStep.step_name || `Unnamed Step ${index + 1}`, // Use name from template, fallback if missing
            step_order: rawStep.step_order || index + 1, // Ensure order

            // Ensure numeric fields are numbers, or null if not present
            duration_override: rawStep.duration_override != null ? Number(rawStep.duration_override) : null,
            target_temperature_celsius: rawStep.target_temperature_celsius != null ? Number(rawStep.target_temperature_celsius) : null,
            contribution_pct: rawStep.contribution_pct != null ? Number(rawStep.contribution_pct) : null,
            target_hydration: rawStep.target_hydration != null ? Number(rawStep.target_hydration) : null,
            stretch_fold_interval_minutes: rawStep.stretch_fold_interval_minutes != null ? Number(rawStep.stretch_fold_interval_minutes) : null,
            
            notes: rawStep.notes || '', // Default to empty string for notes

            // For DND keying and to signify these aren't saved user recipe_steps
            temp_client_id: Date.now() + index + Math.random() + '_public_view_step',
            recipe_step_id: undefined,
        };
    });
    setProcessedSteps(stepsForDisplay);
    // --- End of Direct Step Processing ---

    setFeedbackMessage({ type: 'info', text: `${template.recipe_name} template loaded.` });
}, []); // Removed dependencies like predefinedSteps, as we are handling defaults directly if needed


    // ... (useEffect for calculation remains the same)
    useEffect(() => {
        if (currentTemplateDetails) {
            const newResults = calculateRecipe(
                displayRecipeInputs.targetDoughWeight,
                currentTemplateDetails.hydrationPercentage,
                currentTemplateDetails.saltPercentage,
                processedSteps,
                currentTemplateDetails.steps?.find(s => s.step_id === PUBLIC_LEVAIN_STEP_ID)?.step_id || null
            );
            setCalculationResults(newResults);
        } else {
             setCalculationResults({ flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0 });
        }
    }, [displayRecipeInputs.targetDoughWeight, currentTemplateDetails, processedSteps]);

    // ... (handleTargetDoughWeightChange remains the same)
    const handleTargetDoughWeightChange = (field, value) => {
        if (field === 'targetDoughWeight') {
            setDisplayRecipeInputs(prev => ({ ...prev, targetDoughWeight: value }));
        }
    };

    const callToActionMessage = "Explore our basic templates! Adjust the total dough weight to see ingredient calculations. For full customization, access to more recipes, and to save your own creations, please register or login.";

    return (
        // Use a fragment or a neutral parent div that doesn't apply flex column styling by default
        <>
            <p style={{ textAlign: 'center', margin: '20px 0', padding: '10px', background: '#e9ecef', borderRadius: '5px', border: '1px solid #ced4da' }}>
                {callToActionMessage}
            </p>

            {feedbackMessage.text && (
                <p className={`${styles.feedbackMessage} ${
                    feedbackMessage.type === 'error' ? styles.feedbackMessageError : styles.feedbackMessageInfo
                }`}>
                    {feedbackMessage.text}
                </p>
            )}

            {/* BaseTemplates is now outside the two-column layout div */}
            <BaseTemplates
                baseRecipeTemplates={baseRecipeTemplates}
                isLoadingBaseTemplates={isLoadingBaseTemplates}
                activeTemplateId={activeTemplateId}
                onLoadTemplateData={handleLoadTemplateData}
                isInTemplateMode={true}
            />

            {/* Conditionally render the two-column layout only if a template is selected */}
            {currentTemplateDetails && (
                <div className={styles.recipeCalculatorLayout}> {/* This div applies the two-column flex layout */}
                    <div className={styles.recipeDetailsColumn}>
                        <div className={styles.inputsSection}>
                            <h3>Recipe Inputs</h3>
                            <RecipeFields
                                recipe={displayRecipeInputs}
                                onFieldChange={handleTargetDoughWeightChange}
                                isSaving={false}
                                clearFeedback={() => setFeedbackMessage({ type: '', text: '' })}
                                isInputsSection={true}
                                isInTemplateMode={true}
                            />
                        </div>
                        <RecipeResults results={calculationResults} />
                    </div>
                    <StepsColumn
                        recipeSteps={processedSteps}
                        predefinedSteps={[]}
                        onStepChange={() => {}}
                        onDeleteStep={() => {}}
                        onAddStep={() => {}}
                        onDragEnd={() => {}}
                        isLoadingPredefinedSteps={false}
                        isSaving={false}
                        isInTemplateMode={true}
                        getStepDnDId={getStepDnDId}
                        levainStepId={PUBLIC_LEVAIN_STEP_ID}
                        bulkFermentStepId={PUBLIC_BULK_FERMENT_STEP_ID}
                    />
                </div>
            )}
        </>
    );
}

export default PublicRecipeCalculatorView;