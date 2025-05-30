// src/components/GuidedBakePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import RecipeService from '../services/RecipeService';
import styles from './GuidedBakePage.module.css';

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

    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState('');

    const [bakeSessionDetails, setBakeSessionDetails] = useState(null);
    const [currentStep, setCurrentStep] = useState(null);
    const [nextStepPreview, setNextStepPreview] = useState(null);
    const [userNotes, setUserNotes] = useState('');

    // Main step timer state
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [bakeStatus, setBakeStatus] = useState('active');

    // Stretch and Fold (S&F) Timer State
    const [isSAndFStep, setIsSAndFStep] = useState(false);
    const [sAndFIntervalDuration, setSAndFIntervalDuration] = useState(0);
    const [sAndFTimeRemaining, setSAndFTimeRemaining] = useState(0);
    const [isSAndFTimerActive, setIsSAndFTimerActive] = useState(false);
    const [currentFold, setCurrentFold] = useState(0);
    const [totalFolds, setTotalFolds] = useState(0);
    const [sAndFAlertMessage, setSAndFAlertMessage] = useState('');

    const resetSAndFState = useCallback(() => {
        console.log('S&F Timer: resetSAndFState called');
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
        setError('');
        resetSAndFState();
        console.log('S&F Timer: loadData called. calledFromAction:', calledFromAction);

        try {
            let dataToProcess;
            if (!calledFromAction && location.state && location.state.initialBakeData) {
                dataToProcess = location.state.initialBakeData;
            } else if (bakeLogId) {
                dataToProcess = await RecipeService.getBakeLogDetails(bakeLogId);
            } else {
                setError("No Bake Log ID provided.");
                if (!calledFromAction) setIsLoading(false);
                return;
            }

            if (dataToProcess) {
                setBakeSessionDetails(dataToProcess);
                setBakeStatus(dataToProcess.status || 'active');
                const stepData = dataToProcess.currentStepDetails || dataToProcess.firstStepDetails;

                if (stepData) {
                    setCurrentStep(stepData);
                    setUserNotes(stepData.user_step_notes || stepData.notes || '');
                    console.log('S&F Timer: Current step data loaded:', stepData);

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
                        console.log('S&F Timer: Step recognized as S&F step.');
                        setIsSAndFStep(true);
                        const intervalSecs = Number(stepData.stretch_fold_interval_minutes) * 60;
                        const totalDurationSecs = Number(stepData.duration_override) * 60;
                        const numFolds = intervalSecs > 0 ? Math.floor(totalDurationSecs / intervalSecs) : 0;
                        
                        setTotalFolds(numFolds > 0 ? numFolds : 0);
                        setCurrentFold(0);
                        setSAndFIntervalDuration(intervalSecs);
                        setSAndFTimeRemaining(intervalSecs);
                        
                        console.log(`S&F Timer: totalFolds set to ${numFolds}, intervalSecs: ${intervalSecs}`);

                        if (numFolds > 0 && dataToProcess.status === 'active') {
                            setIsSAndFTimerActive(true);
                            console.log('S&F Timer: S&F timer activated.');
                        } else {
                             setIsSAndFTimerActive(false);
                             console.log('S&F Timer: S&F timer NOT activated (numFolds <=0 or bake not active).');
                        }
                    } else {
                        console.log('S&F Timer: Step NOT recognized as S&F. Missing/invalid stretch_fold_interval_minutes or duration_override.', {interval: stepData.stretch_fold_interval_minutes, duration: stepData.duration_override });
                    }

                } else {
                    if (dataToProcess.status === 'active') setError("No current active step found.");
                    else setError('');
                    setCurrentStep(null);
                    setIsTimerActive(false);
                }
                setNextStepPreview(dataToProcess.nextStepDetails || null);
            } else if (bakeLogId) {
                setError("Bake session not found or failed to load.");
            }
        } catch (err) {
            setError(err.message || "Failed to load bake session.");
            console.error("Error in GuidedBakePage loading data:", err);
        } finally {
            if (!calledFromAction) setIsLoading(false);
        }
    }, [bakeLogId, location.state, resetSAndFState]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Main Step Timer Effect
    useEffect(() => {
        let intervalId;
        if (bakeStatus === 'active' && isTimerActive && currentStep && currentStep.planned_duration_minutes != null && currentStep.actual_start_timestamp) {
            const plannedDurationSeconds = currentStep.planned_duration_minutes * 60;
            const stepStartTime = new Date(currentStep.actual_start_timestamp).getTime(); // Defined here
            
            intervalId = setInterval(() => {
                const now = Date.now();
                const elapsedSeconds = Math.floor((now - stepStartTime) / 1000); // CORRECTED: Used stepStartTime
                const remaining = plannedDurationSeconds - elapsedSeconds;
                if (remaining <= 0) {
                    setTimeRemaining(0);
                    setIsTimerActive(false);
                } else {
                    setTimeRemaining(remaining);
                }
            }, 1000);
        } else {
            if(isTimerActive) setIsTimerActive(false);
        }
        return () => clearInterval(intervalId);
    }, [isTimerActive, currentStep, bakeStatus]);

    // S&F Timer Effect
    useEffect(() => {
        let sAndFIntervalId;
        if (bakeStatus === 'active' && isSAndFTimerActive && isSAndFStep && currentFold < totalFolds) {
            if (sAndFTimeRemaining > 0) {
                sAndFIntervalId = setInterval(() => {
                    setSAndFTimeRemaining(prev => prev - 1);
                }, 1000);
            } else { 
                const foldNumberToAlert = currentFold + 1;
                console.log(`S&F Timer: Interval ended for fold ${foldNumberToAlert}. Current fold count (before update): ${currentFold}`);
                setSAndFAlertMessage(`Time for Fold ${foldNumberToAlert} of ${totalFolds}!`);
                
                const newCurrentFold = currentFold + 1;
                setCurrentFold(newCurrentFold); 
                
                if (newCurrentFold < totalFolds) { 
                    console.log(`S&F Timer: Preparing for next fold (${newCurrentFold + 1}). Resetting interval timer.`);
                    setSAndFTimeRemaining(sAndFIntervalDuration);
                } else { 
                    console.log(`S&F Timer: All folds cued.`);
                    setIsSAndFTimerActive(false); 
                    setSAndFAlertMessage(`All ${totalFolds} folds cued for this step.`);
                }
            }
        } else if (bakeStatus !== 'active' && isSAndFTimerActive) {
            console.log('S&F Timer: Bake not active, ensuring S&F timer is not running.');
            setIsSAndFTimerActive(false);
        } else if (currentFold >= totalFolds && isSAndFTimerActive) {
            console.log('S&F Timer: All folds complete, ensuring S&F timer is not running.');
            setIsSAndFTimerActive(false);
        }

        return () => {
            clearInterval(sAndFIntervalId);
        };
    }, [
        bakeStatus, 
        isSAndFTimerActive, 
        sAndFTimeRemaining, 
        isSAndFStep, 
        currentFold, 
        totalFolds, 
        sAndFIntervalDuration, 
        currentStep, 
        sAndFAlertMessage
    ]);

    const handleStatusUpdate = async (newStatus) => {
        if (!bakeLogId) return;
        setIsActionLoading(true);
        setError('');
        try {
            const result = await RecipeService.updateBakeStatus(bakeLogId, newStatus);
            setBakeStatus(result.newStatus);
            if (newStatus === 'paused') {
                setIsTimerActive(false);
                setIsSAndFTimerActive(false);
            } else if (newStatus === 'active') {
                await loadData(true);
            } else if (newStatus === 'abandoned') {
                setIsTimerActive(false);
                setIsSAndFTimerActive(false);
                alert("Bake session has been abandoned.");
                navigate('/');
            }
        } catch (err) {
            setError(err.message || `Failed to update status to ${newStatus}.`);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handlePauseBake = () => handleStatusUpdate('paused');
    const handleResumeBake = () => handleStatusUpdate('active');
    const handleAbandonBake = () => {
        if (window.confirm("Are you sure you want to abandon this bake session? This cannot be undone.")) {
            handleStatusUpdate('abandoned');
        }
    };

    const handleCompleteStep = async () => {
        if (!currentStep || !bakeSessionDetails || !bakeSessionDetails.bakeLogId) {
            setError("Cannot complete step: essential bake data is missing.");
            return;
        }
        setIsActionLoading(true);
        setError('');
        setIsTimerActive(false);
        setTimeRemaining(0);

        try {
            const currentStepLogIdentifier = currentStep.bake_step_log_id || currentStep.bakeStepLogId;
            if (!currentStepLogIdentifier) throw new Error("Missing current bake step log ID.");

            const result = await RecipeService.completeStep(
                bakeSessionDetails.bakeLogId,
                currentStepLogIdentifier,
                userNotes
            );

            if (result.bakeLogId && !result.nextStepDetails && !result.currentStepDetails) {
                setBakeStatus('completed');
                setCurrentStep(null);
                setNextStepPreview(null);
                resetSAndFState(); 
                alert("Bake Finished! 🎉");
                navigate('/');
                return;
            }
            await loadData(true); 
        } catch (err) {
            setError(err.message || "Failed to complete step.");
            await loadData(true);
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const dismissSAndFAlert = () => {
        setSAndFAlertMessage('');
    };

    if (isLoading && !currentStep && bakeStatus !== 'completed' && bakeStatus !== 'abandoned') {
        return <p className="loading-message">Loading bake session...</p>;
    }
    if (error) {
        return <p className="feedback-message feedback-message-error">Error: {error}</p>;
    }
    if (!bakeLogId || (!isLoading && !bakeSessionDetails && !error)) {
        return <p className="feedback-message feedback-message-info">Could not load bake session. Please try starting again from a recipe.</p>;
    }

    const isBakeOngoing = currentStep && (bakeStatus === 'active' || bakeStatus === 'paused');

    return (
        <div className={styles.guidedBakePageContainer}>
            {bakeSessionDetails && (
                <div className={styles.pageHeader}>
                    <h1>Guided Bake: {bakeSessionDetails.recipeName || 'Sourdough Adventure'}</h1>
                    <p>Bake Log ID: {bakeLogId} | Status: <strong>{bakeStatus.toUpperCase()}</strong></p>
                </div>
            )}

            {!isBakeOngoing && bakeStatus === 'completed' && (
                <div className={`${styles.bakeStatusMessage} ${styles.completed}`}>
                    <h2>Bake Complete!</h2>
                    <p>Congratulations on finishing your bake!</p>
                    <button onClick={() => navigate('/')} className="btn btn-primary">Back to Recipes</button>
                </div>
            )}
            {!isBakeOngoing && bakeStatus === 'abandoned' && (
                <div className={`${styles.bakeStatusMessage} ${styles.abandoned}`}>
                    <h2>Bake Abandoned</h2>
                    <p>This bake session was marked as abandoned.</p>
                    <button onClick={() => navigate('/')} className="btn btn-secondary">Back to Recipes</button>
                </div>
            )}
             {!isBakeOngoing && bakeStatus !== 'completed' && bakeStatus !== 'abandoned' && !error && (
                 <p className="feedback-message feedback-message-info">No active step to display for this bake. It might be loading, completed, or an issue occurred.</p>
            )}

            {isBakeOngoing && currentStep && (
                <>
                    <div className={styles.currentStepSection}>
                        <h2>Current Step ({currentStep.step_order || 'N/A'}): {currentStep.step_name || currentStep.stepName || 'Unnamed Step'}</h2>
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
                    </div>

                    <div className={styles.timerSection}>
                        {currentStep.planned_duration_minutes != null ? (
                            <>
                                <h3>Main Step Timer</h3>
                                <p className={`${styles.timerDisplay} ${isTimerActive && bakeStatus === 'active' ? styles.active : (bakeStatus === 'paused' ? styles.paused : '')}`}>
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
                    </div>

                    {isSAndFStep && totalFolds > 0 && (
                        <div className={`${styles.timerSection} ${styles.sAndFTimerSection}`}>
                            <h3>Stretch & Fold Progress</h3>
                            {currentFold < totalFolds ? (
                                <>
                                    <p>Fold {currentFold + 1} of {totalFolds}</p>
                                    {isSAndFTimerActive && bakeStatus === 'active' && (
                                        <p className={styles.timerDisplay}>Next fold in: {formatTime(sAndFTimeRemaining)}</p>
                                    )}
                                    {!isSAndFTimerActive && bakeStatus === 'active' && currentFold < totalFolds && (
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
                        </div>
                    )}

                    <div className={styles.notesSection}>
                        <label htmlFor="userNotesForStep">My Notes for this Step:</label>
                        <textarea
                            id="userNotesForStep"
                            value={userNotes}
                            onChange={(e) => setUserNotes(e.target.value)}
                            rows="4"
                            placeholder="e.g., Dough temperature was 23°C..."
                            disabled={isActionLoading || bakeStatus === 'completed' || bakeStatus === 'abandoned'}
                        />
                    </div>

                    {nextStepPreview && (
                        <div className={styles.nextStepPreview}>
                            <p><small>Up next: {nextStepPreview.step_name || nextStepPreview.stepName}</small></p>
                        </div>
                    )}

                    <div className={styles.actionsSection}>
                        <button
                            onClick={handleCompleteStep}
                            className="btn btn-primary buttonWithSpinner"
                            disabled={isActionLoading || isLoading || bakeStatus === 'paused'}
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