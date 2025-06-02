import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import RecipeService, { AuthError } from '../services/RecipeService';
import styles from './GuidedBakePage.module.css';
import Modal from './common/Modal';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useActiveBakes } from '../contexts/ActiveBakesContext';
import { calculateRecipe } from '../utils/recipeUtils';

const formatTime = (totalSeconds) => {
    if (totalSeconds < 0) totalSeconds = 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

function GuidedBakePage() {
    const { bakeLogId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { logout } = useAuth();
    const { refreshActiveBakes } = useActiveBakes();

    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [bakeSessionDetails, setBakeSessionDetails] = useState(null);
    const [currentStep, setCurrentStep] = useState(null);
    const [userNotes, setUserNotes] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [mainTimerJustCompleted, setMainTimerJustCompleted] = useState(false);
    const [bakeStatus, setBakeStatus] = useState('active');
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        content: null,
        actions: []
    });

    const [isSAndFStep, setIsSAndFStep] = useState(false);
    const [sAndFIntervalDuration, setSAndFIntervalDuration] = useState(0);
    const [sAndFTimeRemaining, setSAndFTimeRemaining] = useState(0);
    const [isSAndFTimerActive, setIsSAndFTimerActive] = useState(false);
    const [currentFold, setCurrentFold] = useState(0);
    const [totalFolds, setTotalFolds] = useState(0);
    const [sAndFAlertMessage, setSAndFAlertMessage] = useState('');
    const [currentSfSet, setCurrentSfSet] = useState(1);
    const [nextStepPreview, setNextStepPreview] = useState(null);

    // Modal helpers
    const closeModal = useCallback(() => setModalState(ms => ({ ...ms, isOpen: false })), []);
    const openModal = useCallback((title, content, actions = []) => {
        setModalState({ isOpen: true, title, content, actions });
    }, []);

    // --- Ingredient Calculation ---
    // Defensive: always use attached recipe, even if no current step
const calculationResults = useMemo(() => {
    console.log("DEBUG: bakeSessionDetails", bakeSessionDetails);
    if (
        !bakeSessionDetails ||
        !bakeSessionDetails.recipe ||
        !Array.isArray(bakeSessionDetails.recipe.steps)
    ) {
        console.log("DEBUG: calculationResults not computed due to missing data");
        return null;
    }
    const result = calculateRecipe(
        bakeSessionDetails.recipe.targetDoughWeight,
        bakeSessionDetails.recipe.hydrationPercentage,
        bakeSessionDetails.recipe.saltPercentage,
        bakeSessionDetails.recipe.steps,
        bakeSessionDetails.availableIngredients || [],
        bakeSessionDetails.stepTypeIds || {}
    );
    console.log("DEBUG: calculationResults", result);
    return result;
}, [bakeSessionDetails]);
    // Helper to get calculated ingredient weights for the current step
    const getCalculatedIngredientsForStep = (step) => {
        if (!calculationResults || !step) return [];
        const stepResult = calculationResults.stepBreakdown?.find(
            s =>
                (s.step_id && step.step_id && s.step_id === step.step_id) ||
                (s.step_order && step.step_order && s.step_order === step.step_order)
        );
        if (!stepResult) return [];
        return stepResult.ingredients || [];
    };

    const resetSAndFState = useCallback(() => {
        setIsSAndFStep(false);
        setSAndFIntervalDuration(0);
        setSAndFTimeRemaining(0);
        setIsSAndFTimerActive(false);
        setCurrentFold(0);
        setTotalFolds(0);
        setSAndFAlertMessage('');
        setCurrentSfSet(1);
    }, []);

    const loadData = useCallback(async (calledFromAction = false) => {
        if (!calledFromAction) setIsLoading(true);
        resetSAndFState();

        try {
            if (!bakeLogId) {
                addToast("No Bake Log ID available for this page.", "error");
                if (!calledFromAction) setIsLoading(false);
                navigate('/');
                return;
            }

            let dataToProcess;
            if (!calledFromAction && location.state && location.state.initialBakeData) {
                dataToProcess = location.state.initialBakeData;
            } else {
                dataToProcess = await RecipeService.getBakeLogDetails(bakeLogId);
            }

            if (dataToProcess) {
                setBakeSessionDetails(dataToProcess);
                setBakeStatus(dataToProcess.status || 'active');
                // Prefer currentStepDetails, fallback to firstStepDetails (for just-started bakes)
                const stepData = dataToProcess.currentStepDetails || dataToProcess.firstStepDetails;

                if (stepData) {
                    setCurrentStep(stepData);
                    setUserNotes(stepData.user_step_notes || stepData.notes || '');
                    if (stepData.planned_duration_minutes != null && stepData.actual_start_timestamp) {
                        const startTime = new Date(stepData.actual_start_timestamp).getTime();
                        const now = Date.now();
                        const elapsedSeconds = Math.floor((now - startTime) / 1000);
                        const plannedDurationSeconds = stepData.planned_duration_minutes * 60;
                        const remaining = plannedDurationSeconds - elapsedSeconds;
                        setTimeRemaining(remaining > 0 ? remaining : 0);
                        setIsTimerActive(remaining > 0 && dataToProcess.status === 'active');
                    } else {
                        setTimeRemaining(0);
                        setIsTimerActive(false);
                    }

                    if (stepData.stretch_fold_interval_minutes && stepData.duration_override) {
                        setIsSAndFStep(true);
                        const intervalSecs = Number(stepData.stretch_fold_interval_minutes) * 60;
                        const totalDurationSecs = Number(stepData.duration_override) * 60;
                        const numFolds = intervalSecs > 0 ? Math.floor(totalDurationSecs / intervalSecs) : 0;

                        setTotalFolds(numFolds > 0 ? numFolds : 0);
                        setCurrentFold(0);
                        setSAndFIntervalDuration(intervalSecs);
                        setSAndFTimeRemaining(intervalSecs);

                        if (numFolds > 0 && dataToProcess.status === 'active') {
                            setIsSAndFTimerActive(true);
                        } else {
                            setIsSAndFTimerActive(false);
                        }
                    }
                } else {
                    // No current step (bake finished or abandoned)
                    setCurrentStep(null);
                    setIsTimerActive(false);
                    if (dataToProcess.status === 'active') {
                        addToast("No current active step found for this bake.", "info");
                    }
                }
                setNextStepPreview(dataToProcess.nextStepDetails || null);
            } else if (bakeLogId) {
                addToast("Bake session not found or failed to load.", "error");
            }
        } catch (err) {
            console.error("GuidedBakePage: Error in loadData:", err);
            if (err instanceof AuthError) {
                addToast(err.message || "Your session has expired. Please log in again.", "error");
                logout();
                navigate('/login');
            } else {
                addToast(err.message || "Failed to load bake session.", "error");
            }
        } finally {
            if (!calledFromAction) setIsLoading(false);
        }
    }, [bakeLogId, location.state, resetSAndFState, addToast, logout, navigate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Main step timer useEffect
    useEffect(() => {
        let intervalId;
        if (bakeStatus === 'active' && isTimerActive && currentStep?.planned_duration_minutes != null && currentStep?.actual_start_timestamp) {
            const plannedDurationSeconds = currentStep.planned_duration_minutes * 60;
            const stepStartTime = new Date(currentStep.actual_start_timestamp).getTime();

            intervalId = setInterval(() => {
                const now = Date.now();
                const elapsedSeconds = Math.floor((now - stepStartTime) / 1000);
                const remaining = plannedDurationSeconds - elapsedSeconds;
                if (remaining <= 0) {
                    setTimeRemaining(0);
                    setIsTimerActive(false);
                    setMainTimerJustCompleted(true);
                    setTimeout(() => setMainTimerJustCompleted(false), 1000);
                    addToast("Main step timer finished!", "info");
                    if (isSAndFStep) {
                        setIsSAndFTimerActive(false);
                        setSAndFAlertMessage('');
                    }
                } else {
                    setTimeRemaining(remaining);
                }
            }, 1000);
        } else {
            if (isTimerActive) setIsTimerActive(false);
        }
        return () => clearInterval(intervalId);
    }, [isTimerActive, currentStep, bakeStatus, addToast, isSAndFStep]);

    // S&F timer useEffect
    useEffect(() => {
        let sAndFIntervalId;
        if (bakeStatus === 'active' && isSAndFTimerActive && isSAndFStep && currentFold < totalFolds) {
            if (sAndFTimeRemaining > 0) {
                sAndFIntervalId = setInterval(() => {
                    setSAndFTimeRemaining(prev => prev - 1);
                }, 1000);
            } else {
                const foldNumberToAlert = currentFold + 1;
                const alertMsg = `Time for Fold ${foldNumberToAlert} of ${totalFolds}!`;
                addToast(alertMsg, 'info', 5000);
                setSAndFAlertMessage(alertMsg);

                const newCurrentFold = currentFold + 1;
                setCurrentFold(newCurrentFold);

                if (newCurrentFold < totalFolds) {
                    setSAndFTimeRemaining(sAndFIntervalDuration);
                } else {
                    const allFoldsMsg = `All ${totalFolds} folds cued for this step.`;
                    addToast(allFoldsMsg, 'info', 5000);
                    setSAndFAlertMessage(allFoldsMsg);
                    setIsSAndFTimerActive(false);
                }
            }
        } else if (bakeStatus !== 'active' && isSAndFTimerActive) {
            setIsSAndFTimerActive(false);
        } else if (currentFold >= totalFolds && isSAndFTimerActive) {
            setIsSAndFTimerActive(false);
        }
        return () => clearInterval(sAndFIntervalId);
    }, [bakeStatus, isSAndFTimerActive, isSAndFStep, sAndFTimeRemaining, currentFold, totalFolds, sAndFIntervalDuration, addToast]);

    const handleStatusUpdate = async (newStatus) => {
        if (!bakeLogId) return;
        setIsActionLoading(true);
        try {
            const result = await RecipeService.updateBakeStatus(bakeLogId, newStatus);
            setBakeStatus(result.newStatus);

            if (newStatus === 'paused') {
                setIsTimerActive(false);
                setIsSAndFTimerActive(false);
                addToast("Bake Paused", "info");
            } else if (newStatus === 'active') {
                await loadData(true);
                addToast("Bake Resumed", "info");
            } else if (newStatus === 'abandoned') {
                addToast("Bake session abandoned.", "warning");
                await refreshActiveBakes();
                setIsTimerActive(false);
                setIsSAndFTimerActive(false);
                navigate('/');
            }
        } catch (err) {
            console.error(`GuidedBakePage: Error updating status to ${newStatus}:`, err);
            if (err instanceof AuthError) {
                addToast(err.message || "Your session has expired. Please log in again.", "error");
                logout();
                navigate('/login');
            } else {
                addToast(err.message || `Failed to update status to ${newStatus}.`, "error");
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handlePauseBake = () => handleStatusUpdate('paused');
    const handleResumeBake = () => handleStatusUpdate('active');

    const confirmAbandonBake = () => {
        handleStatusUpdate('abandoned');
        closeModal();
    };

    const handleAbandonBake = () => {
        openModal(
            "Confirm Abandon Bake",
            "Are you sure you want to abandon this bake session? This action cannot be undone.",
            [
                { text: "Cancel", onClick: closeModal, variant: 'secondary' },
                { text: "Abandon Bake", onClick: confirmAbandonBake, variant: 'danger' }
            ]
        );
    };

    const normalizedBakeLogId = bakeSessionDetails?.bakeLogId || bakeSessionDetails?.bake_log_id;

    const handleCompleteStep = async () => {
        if (!currentStep || !normalizedBakeLogId) {
            addToast("Cannot complete step: essential bake data is missing.", "error");
            return;
        }
        setIsActionLoading(true);
        setIsTimerActive(false);
        setTimeRemaining(0);

        try {
            const currentStepLogIdentifier = currentStep.bake_step_log_id || currentStep.bakeStepLogId;
            if (!currentStepLogIdentifier) {
                addToast("Missing current bake step log ID.", "error");
                setIsActionLoading(false);
                return;
            }

            const result = await RecipeService.completeStep(
                normalizedBakeLogId,
                currentStepLogIdentifier,
                userNotes
            );
            addToast("Step marked as complete!", "success");

            if (result.bakeLogId && !result.nextStepDetails && !result.currentStepDetails) {
                setBakeStatus('completed');
                setCurrentStep(null);
                setNextStepPreview(null);
                resetSAndFState();
                await refreshActiveBakes();
                openModal(
                    "Bake Finished!",
                    "Congratulations on completing your bake! 🎉",
                    [{ text: "Back to Recipes", onClick: () => { closeModal(); navigate('/'); }, variant: 'primary' }]
                );
                return;
            }
            await loadData(true);
        } catch (err) {
            console.error("GuidedBakePage: Error completing step:", err);
            if (err instanceof AuthError) {
                addToast(err.message || "Your session has expired. Please log in again.", "error");
                logout();
                navigate('/login');
            } else {
                addToast(err.message || "Failed to complete step.", "error");
                await loadData(true);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleConfirmSfSet = () => {
        if (currentSfSet < (currentStep.number_of_sf_sets || 1)) {
            setCurrentSfSet(currentSfSet + 1);
        } else {
            handleCompleteStep();
        }
    };

    const dismissSAndFAlert = () => {
        setSAndFAlertMessage('');
    };

    if (isLoading && !bakeSessionDetails && bakeStatus !== 'completed' && bakeStatus !== 'abandoned') {
        return <p className={`feedback-message feedback-message-info ${styles.loadingMessage}`}>Loading bake session...</p>;
    }

    if (!bakeLogId || (!isLoading && !bakeSessionDetails && !modalState.isOpen && bakeStatus !== 'completed' && bakeStatus !== 'abandoned')) {
        return (
            <div className={styles.guidedBakePageContainer}>
                <p className={`feedback-message feedback-message-info`}>
                    Could not display bake session. Please try starting again from a recipe or check active bakes.
                </p>
                <button onClick={() => navigate('/')} className="btn btn-primary">Go Home</button>
            </div>
        );
    }

    const isBakeOngoing = currentStep && (bakeStatus === 'active' || bakeStatus === 'paused');

    const getTimerDisplayClasses = (isMainTimer = true) => {
        let classes = isMainTimer ? styles.timerDisplay : styles.sfTimerDisplay;
        if (isMainTimer && mainTimerJustCompleted) {
            classes += ` ${styles.timerCompletedEffect}`;
        } else if ((isMainTimer ? isTimerActive : isSAndFTimerActive) && bakeStatus === 'active') {
            classes += ` ${styles.activeTimer}`;
        } else if (bakeStatus === 'paused') {
            classes += ` ${styles.pausedTimer}`;
        } else if (isMainTimer && timeRemaining <= 0 && currentStep?.planned_duration_minutes != null) {
            classes += ` ${styles.finishedTimer}`;
        } else if (!isMainTimer && sAndFTimeRemaining <= 0 && currentFold >= totalFolds) {
            classes += ` ${styles.finishedTimer}`;
        }
        return classes;
    };

    return (
        <div className={styles.guidedBakePageContainer}>
            <Modal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ ...modalState, isOpen: false })}
                title={modalState.title}
                footerActions={modalState.actions}
            >
                {modalState.content}
            </Modal>

            {bakeSessionDetails && (
                <header className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>Guided Bake: {bakeSessionDetails.recipeName || 'Sourdough Adventure'}</h1>
                    <div className={`${styles.bakeStatusDisplay} ${styles[bakeStatus.toLowerCase()] || ''}`}>
                        Status: {bakeStatus.charAt(0).toUpperCase() + bakeStatus.slice(1)}
                    </div>
                    <p>Bake Log ID: {normalizedBakeLogId}</p>
                </header>
            )}

            {!isBakeOngoing && bakeStatus === 'completed' && (
                <section className={`${styles.section} ${styles.bakeStatusMessage} ${styles.completed}`}>
                    <h2>Bake Complete!</h2>
                    <p>Congratulations on finishing your bake!</p>
                    <button onClick={() => navigate('/')} className="btn btn-primary">Back to Recipes</button>
                </section>
            )}
            {!isBakeOngoing && bakeStatus === 'abandoned' && (
                <section className={`${styles.section} ${styles.bakeStatusMessage} ${styles.abandoned}`}>
                    <h2>Bake Abandoned</h2>
                    <p>This bake session was marked as abandoned.</p>
                    <button onClick={() => navigate('/')} className="btn btn-secondary">Back to Recipes</button>
                </section>
            )}
            {!isBakeOngoing && bakeStatus !== 'completed' && bakeStatus !== 'abandoned' && !isLoading && (
                <p className="feedback-message feedback-message-info">No active step to display for this bake. It might be completed, abandoned, or an issue occurred.</p>
            )}

            {isBakeOngoing && currentStep && (
                <>
                    <section className={styles.currentStepSection}>
                        <h2 className={styles.sectionTitle}>Current Step ({currentStep.step_order || 'N/A'}): {currentStep.step_name || currentStep.stepName || 'Unnamed Step'}</h2>
                        {currentStep.notes || currentStep.description ? (
                            <p className={styles.instructions}><strong>Instructions:</strong> {currentStep.notes || currentStep.description}</p>
                        ) : (
                            <p className={styles.instructions}><em>No specific instructions for this step.</em></p>
                        )}
                    </section>

                    {/* --- Ingredient Table (calculated) --- */}
                    <section className={styles.section}>
                        <h3>Ingredients for This Step</h3>
                        {(() => {
                            // Debug logs
                            console.log("DEBUG: stepBreakdown steps", calculationResults?.stepBreakdown?.map(s => ({ step_id: s.step_id, step_order: s.step_order, step_name: s.step_name })));
                            console.log("DEBUG: currentStep", currentStep);
                            return null;
                        })()}
                        <table className={styles.ingredientTable}>
                            <thead>
                                <tr>
                                    <th>Ingredient</th>
                                    <th>%</th>
                                    <th>g</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(getCalculatedIngredientsForStep(currentStep).length > 0
                                    ? getCalculatedIngredientsForStep(currentStep)
                                    : (currentStep.stageIngredients || [])
                                ).map(ing => (
                                    <tr key={ing.ingredient_id || ing.ingredient_name || ing.stage_ingredient_id}>
                                        <td>{ing.ingredient_name || `Ingredient ${ing.ingredient_id}`}</td>
                                        <td>
                                            {ing.percentage != null && ing.percentage !== ''
                                                ? Number(ing.percentage).toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                : ''}
                                        </td>
                                        <td>
                                            {ing.grams != null && ing.grams !== ''
                                                ? Number(ing.grams).toLocaleString(undefined, { maximumFractionDigits: 1 })
                                                : (
                                                    ing.calculated_weight != null && ing.calculated_weight !== ''
                                                        ? Number(ing.calculated_weight).toLocaleString(undefined, { maximumFractionDigits: 1 })
                                                        : ''
                                                )
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* --- Full Step-by-Step Ingredient Breakdown --- */}
                    {calculationResults && calculationResults.stepBreakdown && (
                        <section className={styles.section}>
                            <h3>All Steps & Ingredients</h3>
                            {calculationResults.stepBreakdown.map((step, idx) => (
                                <div key={step.step_id || step.step_order || idx} className={styles.stepIngredientBlock}>
                                    <h4>
                                        Step {step.step_order}: {step.step_name}
                                    </h4>
                                    <table className={styles.ingredientTable}>
                                        <thead>
                                            <tr>
                                                <th>Ingredient</th>
                                                <th>%</th>
                                                <th>g</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(step.ingredients || []).map(ing => (
                                                <tr key={ing.ingredient_id || ing.ingredient_name || ing.stage_ingredient_id}>
                                                    <td>{ing.ingredient_name || `Ingredient ${ing.ingredient_id}`}</td>
                                                    <td>
                                                        {ing.percentage != null && ing.percentage !== ''
                                                            ? Number(ing.percentage).toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                            : ''}
                                                    </td>
                                                    <td>
                                                        {ing.grams != null && ing.grams !== ''
                                                            ? Number(ing.grams).toLocaleString(undefined, { maximumFractionDigits: 1 })
                                                            : (
                                                                ing.calculated_weight != null && ing.calculated_weight !== ''
                                                                    ? Number(ing.calculated_weight).toLocaleString(undefined, { maximumFractionDigits: 1 })
                                                                    : ''
                                                            )
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </section>
                    )}

                    <section className={`${styles.section} ${styles.timerSection}`}>
                        <h3>Main Step Timer</h3>
                        {currentStep.planned_duration_minutes != null ? (
                            <>
                                <p className={getTimerDisplayClasses(true)}>
                                    {formatTime(timeRemaining)}
                                </p>
                                {timeRemaining <= 0 && !isTimerActive && (
                                    <p className={styles.timerFinishedMessage}>
                                        Timer finished. Please confirm this step is complete to continue.
                                    </p>
                                )}
                                {bakeStatus === 'active' && !isTimerActive && timeRemaining > 0 && (
                                    <button onClick={() => setIsTimerActive(true)} className="btn btn-secondary btn-small" disabled={isActionLoading}>Start Main Timer</button>
                                )}
                                {bakeStatus === 'active' && isTimerActive && (
                                    <button onClick={() => setIsTimerActive(false)} className="btn btn-secondary btn-small" disabled={isActionLoading}>Pause Main Timer</button>
                                )}
                                {bakeStatus === 'paused' && timeRemaining > 0 && <p><i>Main timer is paused.</i></p>}
                            </>
                        ) : (
                            <p>No main duration timer for this step.</p>
                        )}
                    </section>

                    {isSAndFStep && totalFolds > 0 &&
                        (currentStep?.planned_duration_minutes == null || timeRemaining > 0) && (
                            <section className={`${styles.section} ${styles.timerSection} ${styles.sAndFTimerSection}`}>
                                <h3>Stretch & Fold Progress</h3>
                                {currentFold < totalFolds ? (
                                    <>
                                        <p>Fold {currentFold + 1} of {totalFolds}</p>
                                        {isSAndFTimerActive && bakeStatus === 'active' && (
                                            <p className={getTimerDisplayClasses(false)}>{formatTime(sAndFTimeRemaining)} until next fold</p>
                                        )}
                                        {!isSAndFTimerActive && bakeStatus === 'active' && currentFold < totalFolds && timeRemaining > 0 && (
                                            <button
                                                onClick={() => {
                                                    setSAndFTimeRemaining(sAndFIntervalDuration);
                                                    setIsSAndFTimerActive(true);
                                                    setSAndFAlertMessage('');
                                                }}
                                                className="btn btn-secondary btn-small"
                                                disabled={isActionLoading}
                                            >
                                                Start Interval for Fold {currentFold + 1}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <p>All {totalFolds} folds have been cued for this step.</p>
                                )}
                                {sAndFAlertMessage && (
                                    <div className={`feedback-message feedback-message-info ${styles.sAndFAlert}`}>
                                        {sAndFAlertMessage}
                                        {(sAndFAlertMessage.startsWith('Time for Fold') || sAndFAlertMessage.startsWith('All folds cued')) && (
                                            <button onClick={dismissSAndFAlert} className="btn btn-secondary btn-small" style={{ marginLeft: '10px' }}>OK</button>
                                        )}
                                    </div>
                                )}
                                {bakeStatus === 'paused' && currentFold < totalFolds && <p><i>S&F alerts are paused.</i></p>}
                            </section>
                        )}

                    <section className={styles.section}>
                        <label htmlFor="userNotesForStep" className={styles.sectionTitle}>My Notes for this Step:</label>
                        <textarea
                            id="userNotesForStep"
                            className={styles.notesTextArea}
                            value={userNotes}
                            onChange={(e) => setUserNotes(e.target.value)}
                            rows="4"
                            placeholder="e.g., Dough temperature was 23°C..."
                            disabled={isActionLoading || bakeStatus === 'completed' || bakeStatus === 'abandoned'}
                        />
                    </section>

                    {nextStepPreview && (
                        <div className={styles.nextStepPreview}>
                            <p><small>Up next: {nextStepPreview.step_name || nextStepPreview.stepName}</small></p>
                        </div>
                    )}

                    <div className={styles.actionsSection}>
                        <button
                            onClick={handleCompleteStep}
                            className="btn btn-primary buttonWithSpinner"
                            disabled={isActionLoading || isLoading || bakeStatus === 'paused' || (currentStep?.planned_duration_minutes != null && timeRemaining > 0 && isTimerActive)}
                        >
                            {isActionLoading ? 'Completing...' : 'Mark Step as Complete'}
                            {isActionLoading && <span className="buttonSpinner"></span>}
                        </button>

                        {bakeStatus === 'active' && (
                            <button onClick={handlePauseBake} className="btn btn-secondary" disabled={isActionLoading || isLoading}>
                                Pause Bake
                            </button>
                        )}
                        {bakeStatus === 'paused' && (
                            <button onClick={handleResumeBake} className="btn btn-secondary" disabled={isActionLoading || isLoading}>
                                Resume Bake
                            </button>
                        )}
                        {(bakeStatus === 'active' || bakeStatus === 'paused') && (
                            <button
                                onClick={handleAbandonBake}
                                className="btn btn-danger"
                                disabled={isActionLoading || isLoading}
                            >
                                Abandon Bake
                            </button>
                        )}
                    </div>

                    {isSAndFStep && totalFolds > 0 && currentStep.number_of_sf_sets && (
                        <div className={styles.sfSetSection}>
                            <p>
                                Stretch & Fold Set {currentSfSet} of {currentStep.number_of_sf_sets}
                            </p>
                            <button onClick={handleConfirmSfSet} className="btn btn-secondary">
                                {currentSfSet < (currentStep.number_of_sf_sets || 1) ? "Confirm S&F Set Done" : "Finish S&F Phase"}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default GuidedBakePage;