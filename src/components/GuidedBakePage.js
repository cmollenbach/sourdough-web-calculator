// src/components/GuidedBakePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import RecipeService from '../services/RecipeService'; // Ensure this is uncommented
// import styles from './GuidedBakePage.module.css'; // Your styles

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
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [bakeStatus, setBakeStatus] = useState('active');

    const loadData = useCallback(async (calledFromAction = false) => {
        if (!calledFromAction) setIsLoading(true);
        setError('');
        try {
            let dataToProcess;
            if (!calledFromAction && location.state && location.state.initialBakeData) {
                dataToProcess = location.state.initialBakeData;
                // navigate(location.pathname, { replace: true, state: {} }); // Optional
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
                    // IMPORTANT: Ensure 'user_notes' comes from stepData if available, otherwise 'notes' (from RecipeStep)
                    setUserNotes(stepData.user_step_notes || stepData.notes || ''); 
                    
                    if (stepData.planned_duration_minutes != null && stepData.actual_start_timestamp) {
                        const startTime = new Date(stepData.actual_start_timestamp).getTime();
                        const now = Date.now();
                        const elapsedSeconds = Math.floor((now - startTime) / 1000);
                        const plannedDurationSeconds = stepData.planned_duration_minutes * 60;
                        const remaining = plannedDurationSeconds - elapsedSeconds;
                        
                        setTimeRemaining(remaining > 0 ? remaining : 0);
                        setIsTimerActive(remaining > 0 && (dataToProcess.status === 'active'));
                    } else {
                        setTimeRemaining(0);
                        setIsTimerActive(false);
                    }
                } else {
                    if (dataToProcess.status === 'active') {
                        setError("No current active step found. This bake might be new or an issue occurred.");
                    } else {
                         // If bake is completed or abandoned, it's fine not to have a current step
                        setError(''); // Clear error if it's just completed/abandoned
                    }
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
    }, [bakeLogId, location.state, navigate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        let intervalId;
        if (bakeStatus === 'active' && isTimerActive && currentStep && currentStep.planned_duration_minutes != null && currentStep.actual_start_timestamp) {
            const plannedDurationSeconds = currentStep.planned_duration_minutes * 60;
            const stepStartTime = new Date(currentStep.actual_start_timestamp).getTime();
            intervalId = setInterval(() => {
                const now = Date.now();
                const elapsedSeconds = Math.floor((now - stepStartTime) / 1000);
                const remaining = plannedDurationSeconds - elapsedSeconds;
                if (remaining <= 0) {
                    setTimeRemaining(0);
                    setIsTimerActive(false);
                    console.log(`Timer for step "${currentStep.step_name || currentStep.stepName}" finished!`);
                    // You might want to add an auto-alert or visual cue here
                } else {
                    setTimeRemaining(remaining);
                }
            }, 1000);
        } else {
            if(isTimerActive) setIsTimerActive(false);
        }
        return () => clearInterval(intervalId);
    }, [isTimerActive, currentStep, bakeStatus]);

    const handleStatusUpdate = async (newStatus) => {
        // ... (keep existing handleStatusUpdate logic)
        if (!bakeLogId) return;
        setIsActionLoading(true);
        setError('');
        try {
            const result = await RecipeService.updateBakeStatus(bakeLogId, newStatus);
            setBakeStatus(result.newStatus); 
            if (newStatus === 'paused') {
                setIsTimerActive(false);
            } else if (newStatus === 'active') {
                if (timeRemaining > 0 && currentStep?.planned_duration_minutes != null) {
                    await loadData(true); // Reload to get fresh timestamps/durations
                }
            } else if (newStatus === 'abandoned') {
                setIsTimerActive(false);
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
        // ... (keep existing handleCompleteStep logic)
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
                alert("Bake Finished! 🎉");
                navigate('/'); 
                return;
            }
            
            const newStepData = result.currentStepDetails || result.nextStepDetails; 
            if (newStepData) {
                 setCurrentStep(newStepData);
                 // user_notes from the new step would typically be empty or null
                 setUserNotes(newStepData.user_notes || newStepData.notes || ''); 
                 setNextStepPreview(result.furtherNextStepDetails || null); 
                 setBakeStatus('active');

                 if (newStepData.planned_duration_minutes != null && newStepData.actual_start_timestamp) {
                    const startTime = new Date(newStepData.actual_start_timestamp).getTime();
                    const now = Date.now(); // Should be very close to startTime
                    const elapsedSeconds = Math.floor((now - startTime) / 1000); 
                    const plannedDurationSeconds = newStepData.planned_duration_minutes * 60;
                    const remaining = plannedDurationSeconds - elapsedSeconds;
                    
                    setTimeRemaining(remaining > 0 ? remaining : 0);
                    setIsTimerActive(remaining > 0);
                } else {
                    setTimeRemaining(0);
                    setIsTimerActive(false);
                }
            } else {
                console.warn("Step completed, but no valid next step data received.");
                await loadData(true);
            }
        } catch (err) {
            setError(err.message || "Failed to complete step.");
        } finally {
            setIsActionLoading(false);
        }
    };

    // --- JSX / RENDER SECTION ---
    if (isLoading && !currentStep && bakeStatus !== 'completed' && bakeStatus !== 'abandoned') {
        return <p>Loading bake session...</p>;
    }
    if (error) {
        return <p style={{ color: 'red' }}>Error: {error}</p>;
    }
    // Handle case where bakeLogId might be invalid or session details couldn't be loaded initially
    if (!bakeLogId || (!isLoading && !bakeSessionDetails && !error)) {
        return <p>Could not load bake session. Please try starting again from a recipe.</p>;
    }

    const isBakeOngoing = currentStep && (bakeStatus === 'active' || bakeStatus === 'paused');

    return (
        <div className={/* styles.guidedBakePageContainer */ null} style={{ padding: '20px' }}>
            {bakeSessionDetails && (
                <h1>Guided Bake: {bakeSessionDetails.recipeName || 'Sourdough Adventure'}</h1>
            )}
            <p>Bake Log ID: {bakeLogId} | Status: <span style={{fontWeight: 'bold'}}>{bakeStatus}</span></p>
            <hr />

            {!isBakeOngoing && bakeStatus === 'completed' && (
                <div>
                    <h2>Bake Complete!</h2>
                    <p>Congratulations on finishing your bake!</p>
                    <button onClick={() => navigate('/')}>Back to Recipes</button>
                </div>
            )}
            {!isBakeOngoing && bakeStatus === 'abandoned' && (
                <div>
                    <h2>Bake Abandoned</h2>
                    <p>This bake session was marked as abandoned.</p>
                    <button onClick={() => navigate('/')}>Back to Recipes</button>
                </div>
            )}
             {/* Display this if no current step but bake is not explicitly completed/abandoned (e.g. error state) */}
            {!isBakeOngoing && bakeStatus !== 'completed' && bakeStatus !== 'abandoned' && !error && (
                 <p>No active step to display for this bake. It might be loading, completed, or an issue occurred.</p>
            )}


            {isBakeOngoing && currentStep && (
                <>
                    <div className={/* styles.currentStepSection */ null} style={{ marginBottom: '20px' }}>
                        <h2>Current Step ({currentStep.step_order || 'N/A'}): {currentStep.step_name || currentStep.stepName || 'Unnamed Step'}</h2>
                        
                        {currentStep.notes || currentStep.description ? ( // Prioritize RecipeStep.notes, then Step.description
                            <p><strong>Instructions:</strong> {currentStep.notes || currentStep.description}</p>
                        ) : (
                            <p><em>No specific instructions for this step.</em></p>
                        )}

                        {currentStep.planned_duration_minutes != null && (
                            <p><strong>Planned Duration:</strong> {currentStep.planned_duration_minutes} minutes</p>
                        )}
                        {currentStep.target_temperature_celsius != null && (
                            <p><strong>Target Temperature:</strong> {currentStep.target_temperature_celsius}°C</p>
                        )}
                        {currentStep.stretch_fold_interval_minutes != null && (
                            <p><strong>Stretch & Fold Interval:</strong> {currentStep.stretch_fold_interval_minutes} minutes</p>
                        )}
                        {currentStep.actual_start_timestamp && (
                            <p><small>Step Started: {new Date(currentStep.actual_start_timestamp).toLocaleString()}</small></p>
                        )}
                    </div>

                    <div className={/* styles.timerSection */ null} style={{ margin: '20px 0', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                        {currentStep.planned_duration_minutes != null && (bakeStatus === 'active' || bakeStatus === 'paused') ? (
                            <>
                                <h3>Timer</h3>
                                <p style={{ fontSize: '2em', fontWeight: 'bold', color: isTimerActive ? 'green' : 'orange' }}>
                                    {formatTime(timeRemaining)}
                                </p>
                                {bakeStatus === 'active' && !isTimerActive && timeRemaining > 0 && (
                                    <button onClick={() => setIsTimerActive(true)} disabled={isActionLoading}>Start Step Timer</button>
                                )}
                                {bakeStatus === 'active' && isTimerActive && (
                                    <button onClick={() => setIsTimerActive(false)} disabled={isActionLoading}>Pause Step Timer</button>
                                )}
                                 {bakeStatus === 'paused' && <p><i>Timer is paused because the bake is paused.</i></p>}
                            </>
                        ) : (
                            <p>No active timer for this step.</p>
                        )}
                    </div>

                    <div className={/* styles.notesSection */ null} style={{ margin: '20px 0' }}>
                        <label htmlFor="userNotesForStep" style={{ display: 'block', marginBottom: '5px' }}>My Notes for this Step:</label>
                        <textarea
                            id="userNotesForStep"
                            value={userNotes}
                            onChange={(e) => setUserNotes(e.target.value)}
                            rows="4"
                            placeholder="e.g., Dough temperature was 23°C..."
                            style={{ width: '98%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                            disabled={isActionLoading || bakeStatus === 'completed' || bakeStatus === 'abandoned'}
                        />
                    </div>

                    {nextStepPreview && (
                        <div className={/* styles.nextStepPreview */ null} style={{ marginTop: '10px', color: 'grey', fontStyle: 'italic' }}>
                            <p><small>Up next: {nextStepPreview.step_name || nextStepPreview.stepName}</small></p>
                        </div>
                    )}

                    <div className={/* styles.actionsSection */ null} style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                        <button 
                            onClick={handleCompleteStep} 
                            disabled={isActionLoading || isLoading || bakeStatus === 'paused'}
                            style={{ padding: '10px 15px', fontSize: '1em' }}
                        >
                            {isActionLoading ? 'Completing...' : 'Mark Step as Complete'}
                        </button>
                        
                        {bakeStatus === 'active' && (
                            <button onClick={handlePauseBake} disabled={isActionLoading || isLoading} style={{ padding: '10px 15px' }}>
                                Pause Bake
                            </button>
                        )}
                        {bakeStatus === 'paused' && (
                            <button onClick={handleResumeBake} disabled={isActionLoading || isLoading} style={{ padding: '10px 15px' }}>
                                Resume Bake
                            </button>
                        )}
                        {(bakeStatus === 'active' || bakeStatus === 'paused') && (
                            <button 
                                onClick={handleAbandonBake} 
                                disabled={isActionLoading || isLoading} 
                                style={{ backgroundColor: '#d9534f', color: 'white', padding: '10px 15px', border: 'none' }}
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