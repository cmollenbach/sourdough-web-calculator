// src/components/GuidedBakePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import RecipeService, { AuthError } from '../services/RecipeService'; // Import AuthError
import styles from './GuidedBakePage.module.css';
import Modal from './common/Modal';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext'; 
import { useActiveBakes } from '../contexts/ActiveBakesContext';

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
    const { refreshActiveBakes } = useActiveBakes(); // Get refreshActiveBakes from context
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    // const [error, setError] = useState(''); // Removed, using toasts instead

    const [bakeSessionDetails, setBakeSessionDetails] = useState(null);
    const [currentStep, setCurrentStep] = useState(null);
    const [nextStepPreview, setNextStepPreview] = useState(null);
    const [userNotes, setUserNotes] = useState('');

    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [mainTimerJustCompleted, setMainTimerJustCompleted] = useState(false);
    const [bakeStatus, setBakeStatus] = useState('active');

    const [isSAndFStep, setIsSAndFStep] = useState(false);
    const [sAndFIntervalDuration, setSAndFIntervalDuration] = useState(0);
    const [sAndFTimeRemaining, setSAndFTimeRemaining] = useState(0);
    const [isSAndFTimerActive, setIsSAndFTimerActive] = useState(false);
    const [currentFold, setCurrentFold] = useState(0);
    const [totalFolds, setTotalFolds] = useState(0);
    const [sAndFAlertMessage, setSAndFAlertMessage] = useState('');

    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        content: null,
        actions: []
    });

    const openModal = (title, content, actions = []) => {
        setModalState({ isOpen: true, title, content, actions });
    };

    const closeModal = () => {
        setModalState({ isOpen: false, title: '', content: null, actions: [] });
    };

    const resetSAndFState = useCallback(() => {
        setIsSAndFStep(false);
        setSAndFIntervalDuration(0);
        setSAndFTimeRemaining(0);
        setIsSAndFTimerActive(false);
        setCurrentFold(0);
        setTotalFolds(0);
        setSAndFAlertMessage('');
    }, []);

    const loadData = useCallback(async (calledFromAction = false) => {
        if (!calledFromAction) setIsLoading(true);
        resetSAndFState();

        try {
            if (!bakeLogId) {
                addToast("No Bake Log ID available for this page.", "error");
                if (!calledFromAction) setIsLoading(false);
                navigate('/'); // Navigate away if no ID
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
                const stepData = dataToProcess.currentStepDetails || dataToProcess.firstStepDetails;

                if (stepData) {
                    setCurrentStep(stepData);
                    setUserNotes(stepData.user_step_notes || stepData.notes || '');
                    // ... (timer and S&F setup logic remains the same)
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
                        setCurrentFold(0); // Reset fold count on data load
                        setSAndFIntervalDuration(intervalSecs);
                        setSAndFTimeRemaining(intervalSecs); // Reset S&F timer
                        
                        if (numFolds > 0 && dataToProcess.status === 'active') {
                            setIsSAndFTimerActive(true); // Start S&F timer if conditions met
                        } else {
                             setIsSAndFTimerActive(false);
                        }
                    }
                } else {
                    if (dataToProcess.status === 'active') {
                        addToast("No current active step found for this bake.", "info");
                    }
                    setCurrentStep(null);
                    setIsTimerActive(false);
                }
                setNextStepPreview(dataToProcess.nextStepDetails || null);
            } else if (bakeLogId) { // Only if bakeLogId was present but dataToProcess is not
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

    // Main step timer useEffect (with S&F stop logic from previous step)
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
            if(isTimerActive) setIsTimerActive(false);
        }
        return () => clearInterval(intervalId);
    }, [isTimerActive, currentStep, bakeStatus, addToast, isSAndFStep]);

    // S&F timer useEffect (with isSAndFStep in dependency array from previous step)
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
                await loadData(true); // Reload to get current step and timer states
                addToast("Bake Resumed", "info");
            } else if (newStatus === 'abandoned') {
                addToast("Bake session abandoned.", "warning");
                await refreshActiveBakes(); // <-- Call refresh here
                setIsTimerActive(false);    // Explicitly stop timers
                setIsSAndFTimerActive(false);
                navigate('/'); // Navigate after refresh
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
        handleStatusUpdate('abandoned'); // This will navigate on success
        closeModal();
    };

    const handleAbandonBake = () => { // This function definition is fine
        openModal(
            "Confirm Abandon Bake",
            "Are you sure you want to abandon this bake session? This action cannot be undone.",
            [
                { text: "Cancel", onClick: closeModal, variant: 'secondary' },
                { text: "Abandon Bake", onClick: confirmAbandonBake, variant: 'danger' }
            ]
        );
    };

    const handleCompleteStep = async () => {
        if (!currentStep || !bakeSessionDetails?.bakeLogId) {
            addToast("Cannot complete step: essential bake data is missing.", "error");
            return;
        }
        setIsActionLoading(true);
        setIsTimerActive(false); // Stop main timer locally on completion attempt
        // setIsSAndFTimerActive(false); // S&F timer is stopped by main timer effect or when all folds done
        setTimeRemaining(0);

        try {
            const currentStepLogIdentifier = currentStep.bake_step_log_id || currentStep.bakeStepLogId;
            if (!currentStepLogIdentifier) {
                addToast("Missing current bake step log ID.", "error");
                setIsActionLoading(false); // Reset loading state
                return; // Exit early
            }

            const result = await RecipeService.completeStep(
                bakeSessionDetails.bakeLogId,
                currentStepLogIdentifier,
                userNotes
            );
            addToast("Step marked as complete!", "success");

            if (result.bakeLogId && !result.nextStepDetails && !result.currentStepDetails) { // Bake finished
                setBakeStatus('completed');
                setCurrentStep(null);
                setNextStepPreview(null);
                resetSAndFState();
                openModal(
                    "Bake Finished!",
                    "Congratulations on completing your bake! 🎉",
                    [{ text: "Back to Recipes", onClick: () => { closeModal(); navigate('/'); }, variant: 'primary' }]
                );
                return; // No further loadData needed if bake is finished
            }
            await loadData(true); // Load next step details
        } catch (err) {
            console.error("GuidedBakePage: Error completing step:", err);
            if (err instanceof AuthError) {
                addToast(err.message || "Your session has expired. Please log in again.", "error");
                logout();
                navigate('/login');
            } else {
                addToast(err.message || "Failed to complete step.", "error");
                // Consider if loadData(true) is still appropriate here or if timers should be reset based on error
                await loadData(true); // Attempt to reload current state on non-auth error
            }
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const dismissSAndFAlert = () => {
        setSAndFAlertMessage('');
    };

    // Removed the `if (error && !modalState.isOpen)` block
    // The loading message now doesn't depend on local `error` state
    if (isLoading && !bakeSessionDetails && bakeStatus !== 'completed' && bakeStatus !== 'abandoned') {
        return <p className={`feedback-message feedback-message-info ${styles.loadingMessage}`}>Loading bake session...</p>;
    }
    
    // Fallback for when no bakeLogId or critical data is missing after initial load attempts.
    // This condition might be hit if `loadData` navigates away due to no bakeLogId,
    // or if it fails to set bakeSessionDetails after an error toast.
    if (!bakeLogId || (!isLoading && !bakeSessionDetails && !modalState.isOpen && bakeStatus !== 'completed' && bakeStatus !== 'abandoned')) {
        // A toast for "No Bake Log ID" or "Failed to load" would have already been shown by loadData.
        // This is a fallback display if the component still tries to render without essential data.
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
        } else if (isMainTimer && timeRemaining <=0 && currentStep?.planned_duration_minutes != null) {
            classes += ` ${styles.finishedTimer}`;
        } else if (!isMainTimer && sAndFTimeRemaining <= 0 && currentFold >= totalFolds) { // Changed: check currentFold vs totalFolds for S&F finished
            classes += ` ${styles.finishedTimer}`;
        }
        return classes;
    };

    return (
        // ... JSX Structure ...
        // Conditional rendering for S&F section (using the fix from previous step)
        // {isSAndFStep && totalFolds > 0 && 
        //     (currentStep?.planned_duration_minutes == null || timeRemaining > 0) && (
        //     <section>...</section>
        // )}
        // ... rest of the JSX (which seems largely fine for toast usage)
        <div className={styles.guidedBakePageContainer}>
            <Modal
                isOpen={modalState.isOpen}
                onClose={closeModal}
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
                    <p>Bake Log ID: {bakeLogId}</p>
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
                        <div className={styles.details}>
                            {currentStep.planned_duration_minutes != null && (
                                <p><strong>Planned Duration:</strong> {currentStep.planned_duration_minutes} minutes</p>
                            )}
                            {currentStep.target_temperature_celsius != null && (
                                <p><strong>Target Temperature:</strong> {currentStep.target_temperature_celsius}°C</p>
                            )}
                            {isSAndFStep && totalFolds > 0 && currentStep.stretch_fold_interval_minutes && (
                                <p><strong>Stretch & Folds:</strong> {totalFolds} total, every {currentStep.stretch_fold_interval_minutes} mins</p>
                            )}
                        </div>
                        {currentStep.actual_start_timestamp && (
                            <p className={styles.stepTimestamp}><small>Step Started: {new Date(currentStep.actual_start_timestamp).toLocaleString()}</small></p>
                        )}
                    </section>

                    <section className={`${styles.section} ${styles.timerSection}`}>
                        <h3>Main Step Timer</h3>
                        {currentStep.planned_duration_minutes != null ? (
                            <>
                                <p className={getTimerDisplayClasses(true)}>
                                    {formatTime(timeRemaining)}
                                </p>
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
                                    {!isSAndFTimerActive && bakeStatus === 'active' && currentFold < totalFolds && timeRemaining > 0 && ( // Ensure main timer is also running for S&F start button
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
                                         <button onClick={dismissSAndFAlert} className="btn btn-secondary btn-small" style={{marginLeft: '10px'}}>OK</button>
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
                            disabled={isActionLoading || isLoading || bakeStatus === 'paused' || (currentStep?.planned_duration_minutes != null && timeRemaining > 0 && isTimerActive) }
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
                </>
            )}
        </div>
    );
}

export default GuidedBakePage;