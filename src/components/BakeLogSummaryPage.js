import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function BakeLogSummaryPage() {
  const { token } = useAuth();
  const { bakeLogId } = useParams();
  const [bake, setBake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchBake() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/bakes/${bakeLogId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        if (res.status === 304) {
          throw new Error("No new data (304 Not Modified)");
        }
        if (!res.ok) {
          let errorMsg = 'Failed to fetch bake details.';
          try {
            const errData = await res.json();
            errorMsg = errData.message || errorMsg;
          } catch {
            const errText = await res.text();
            if (errText.startsWith('<!DOCTYPE')) errorMsg = 'Server returned HTML (possible auth or proxy error).';
            else errorMsg = errText;
          }
          throw new Error(errorMsg);
        }
        const data = await res.json();
        setBake(data);
      } catch (err) {
        setError(err.message || 'An error occurred.');
      }
      setLoading(false);
    }
    fetchBake();
  }, [token, bakeLogId]);

  if (loading) return (
    <div className="feedback-message feedback-message-info" style={{ textAlign: 'center' }}>
      <span className="buttonSpinner" style={{ marginRight: 8 }} /> Loading...
    </div>
  );
  if (error) return <div className="feedback-message feedback-message-error">{error}</div>;
  if (!bake) return <div className="feedback-message feedback-message-error">Bake not found.</div>;

  const { recipe_name, description, target_dough_weight, target_hydration_pct, target_salt_pct, status, user_overall_notes, historyStepDetails = [] } = bake;

  return (
    <div className="bake-log-summary-container" style={{ maxWidth: 700, margin: '0 auto', background: 'var(--color-surface)', borderRadius: 8, padding: 24, boxShadow: 'var(--box-shadow-medium)' }}>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: 16 }}>← Back to Bake History</button>
      <h2 style={{ marginTop: 0 }}>{recipe_name || 'Untitled Recipe'} (Bake Log)</h2>
      <p><strong>Description:</strong> {description || 'No description.'}</p>
      <div style={{ marginBottom: 16 }}>
        <strong>Target Dough Weight:</strong> {target_dough_weight}g&nbsp;|&nbsp;
        <strong>Hydration:</strong> {target_hydration_pct}%&nbsp;|&nbsp;
        <strong>Salt:</strong> {target_salt_pct}%
      </div>
      <div className={`bakeStatusDisplay ${status}`}>{status?.charAt(0).toUpperCase() + status?.slice(1)}</div>
      <h3>Step-by-Step Timeline</h3>
      <ol style={{ paddingLeft: 20 }}>
        {historyStepDetails.map((step, idx) => (
          <li key={step.bake_step_log_id || idx} style={{ marginBottom: 20, background: 'var(--color-secondary)', borderRadius: 6, padding: 12, border: '1px solid var(--color-border-light)' }}>
            <div style={{ fontWeight: 600, fontSize: '1.05em', marginBottom: 4 }}>{step.step_name} <span className="stepOrderText"> (Order: {step.step_order})</span></div>
            <div style={{ fontSize: '0.97em', color: 'var(--color-text-muted)' }}>
              <strong>Planned:</strong> {step.planned_duration_minutes} min<br />
              <strong>Actual:</strong> {step.actual_start_timestamp ? new Date(step.actual_start_timestamp).toLocaleString() : 'N/A'} – {step.actual_end_timestamp ? new Date(step.actual_end_timestamp).toLocaleString() : 'N/A'}
              {step.actual_start_timestamp && step.actual_end_timestamp && (
                <> ({Math.round((new Date(step.actual_end_timestamp) - new Date(step.actual_start_timestamp)) / 60000)} min)</>
              )}
            </div>
            
            {step.target_temperature_celsius !== undefined && (
              <div style={{ fontSize: '0.97em', color: 'var(--color-text-muted)' }}>Target Temp: {step.target_temperature_celsius}°C</div>
            )}
            {step.stretch_fold_interval_minutes !== undefined && (
              <div style={{ fontSize: '0.97em', color: 'var(--color-text-muted)' }}>S&F Interval: {step.stretch_fold_interval_minutes} min</div>
            )}
            {step.notes && <div style={{ marginTop: 4 }}><strong>Step Notes:</strong> {step.notes}</div>}
            
            {step.user_step_notes && <div style={{ marginTop: 4 }}><strong>Your Notes:</strong> {step.user_step_notes}</div>}
            {step.stageIngredients && step.stageIngredients.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <strong>Stage Ingredients:</strong>
                <ul className="flourBreakdownList">
                  {step.stageIngredients.map(ing => (
                    <li key={ing.stage_ingredient_id}>
                      {ing.ingredient_name} ({ing.percentage}%){ing.is_wet ? ' [wet]' : ''} {ing.calculated_weight ? `- ${ing.calculated_weight}g` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ol>
      <h3>Overall Notes</h3>
      <p>{user_overall_notes || 'No notes.'}</p>
      <div style={{ marginTop: 24 }}>
        <button className="btn" onClick={() => {/* TODO: Implement re-bake logic */}} disabled>
          Re-bake This Recipe
        </button>
        <button className="btn btn-secondary" onClick={() => {/* TODO: Implement refine logic */}} style={{ marginLeft: 8 }} disabled>
          Refine Recipe
        </button>
      </div>
    </div>
  );
}

export default BakeLogSummaryPage;