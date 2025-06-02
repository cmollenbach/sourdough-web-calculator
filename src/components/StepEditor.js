import React, { useState, useMemo, useEffect } from 'react';
import InfoButton from './InfoButton';
import Modal from './common/Modal';
import { getInfoButtonContent, hasHardcodedInfoForStepName } from '../utils/infoContent';
import { getGenAiPrompt } from '../utils/genAiPrompts';
import FlourMixEditor from './FlourMixEditor';
import { fetchAiAdvice } from '../utils/aiApi';
import styles from './RecipeCalculator.module.css';
import { DEFAULT_BREAD_FLOUR_ID } from '../constants/recipeConstants';

export default function StepEditor({
  step,
  index,
  isSimplifiedViewActive,
  onStepChange,
  onDeleteStep,
  isSaving,
  isInTemplateMode,
  availableIngredients,
  onFlourMixChange,
  predefinedSteps, // <-- this is your /api/recipes/steps data
  recipe,
  dndListeners,
  dndAttributes,
}) {
  const [infoModal, setInfoModal] = useState({ open: false, title: '', content: '' });
  const [aiModal, setAiModal] = useState({ open: false, loading: false, error: null, content: '' });

  // LOG: What are the predefined steps and current step type?
  console.log('StepEditor: predefinedSteps:', predefinedSteps);
  console.log('StepEditor: step.step_type:', step.step_type);

  function handleInfoClick(title, content) {
    setInfoModal({ open: true, title, content });
  }

  function handleNumericFieldChange(field, value) {
    const num = value === '' ? null : parseInt(value, 10);
    onStepChange(index, field, isNaN(num) ? null : num);
  }

  function handleFloatFieldChange(field, value) {
    const num = value === '' ? null : parseFloat(value);
    onStepChange(index, field, isNaN(num) ? null : num);
  }

  function handleFieldChange(field, value) {
    if (field === 'step_name') {
      const selected = predefinedSteps.find(s => s.step_name === value);
      if (selected) {
        onStepChange(index, 'step_name', value);
        onStepChange(index, 'step_type', selected.step_type); // <-- Add this line
      } else {
        onStepChange(index, 'step_name', value);
      }
    } else {
      onStepChange(index, field, value);
    }
  }

  function handleCustomizeFlourMixChange(val) {
    onStepChange(index, 'customizeFlourMix', val);
  }

  const fieldsDisabled = isSaving || isInTemplateMode;

  // Use step_type to filter step name options
  const stepNameOptions = useMemo(
  () => predefinedSteps.map(s => s.step_name),
  [predefinedSteps]
);

  // LOG: What are the step name options?
  console.log('StepEditor: stepNameOptions:', stepNameOptions);

  const safeStepName = step.step_name || '';
  const showInfoButton = hasHardcodedInfoForStepName(safeStepName);
  const infoTitle = safeStepName;
  const infoContent = getInfoButtonContent('', safeStepName) || '';

  // LOG: What is the current step_name and will InfoButton show?
  console.log('StepEditor: safeStepName:', safeStepName, 'showInfoButton:', showInfoButton);

  const isPreferment = step.step_type === 'preferment';
  const isMainMix = step.step_type === 'main_mix';
  const isTiming = step.step_type === 'timing';
  const isStretchAndFold = isTiming && safeStepName.toLowerCase().includes('stretch and fold');

  const guidedDefaults = useMemo(() => {
    if (isPreferment) return { contribution_pct: 20, target_hydration: 100 };
    return {};
  }, [isPreferment]);

  useEffect(() => {
    if (isPreferment) {
      onStepChange(index, 'duration_override', null);
      onStepChange(index, 'duration_minutes', null);
      onStepChange(index, 'salt_percentage', null);
    } else if (isMainMix) {
      onStepChange(index, 'contribution_pct', null);
      onStepChange(index, 'duration_override', null);
      onStepChange(index, 'duration_minutes', null);
    } else if (isTiming) {
      onStepChange(index, 'contribution_pct', null);
      onStepChange(index, 'target_hydration', null);
      onStepChange(index, 'salt_percentage', null);
    }
    // eslint-disable-next-line
  }, [step.step_type]);

  async function handleAiAdvice() {
    setAiModal({ open: true, loading: true, error: null, content: '' });
    try {
      const prompt = getGenAiPrompt(step, recipe);
      const content = await fetchAiAdvice(prompt);
      setAiModal({ open: true, loading: false, error: null, content });
    } catch (error) {
      setAiModal({ open: true, loading: false, error: error.message, content: '' });
    }
  }

  return (
    <div className={styles.stepItemEditor} {...(dndAttributes || {})}>
      <div className={styles.stepHeader}>
        <div
          {...(dndListeners || {})}
          className={styles.dragHandle}
          style={{
            cursor: dndListeners ? 'grab' : 'default',
            padding: '0 8px',
            marginRight: '8px',
            touchAction: 'none'
          }}
          title="Drag to reorder step"
        >
          ☰
        </div>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          {predefinedSteps && predefinedSteps.length > 0 && !isInTemplateMode ? (
            <select
              className={styles.stepTypeSelect}
              value={step.step_name || ''}
              onChange={e => handleFieldChange('step_name', e.target.value)}
              disabled={fieldsDisabled}
              style={{ minWidth: 160 }}
            >
              <option value="">Select step name...</option>
              {stepNameOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : (
            <span style={{ fontWeight: 400, color: 'var(--color-text)' }}>
              {step.step_name || 'Unnamed Step'}
            </span>
          )}
          {showInfoButton && (
            <InfoButton
              content={infoContent}
              onClick={() => handleInfoClick(infoTitle, infoContent)}
            />
          )}
          <button
            type="button"
            className={styles.aiButton}
            onClick={handleAiAdvice}
            disabled={fieldsDisabled}
            title="Get AI advice for this step"
          >
            🤖
          </button>
          {!isInTemplateMode && !isMainMix && (
            <button
              type="button"
              className="btn btn-danger btn-small"
              onClick={() => onDeleteStep(index)}
              disabled={fieldsDisabled}
              style={{ marginLeft: 'auto' }}
            >
              Remove
            </button>
          )}
        </h4>
      </div>

      {isPreferment && (
        <>
          <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
            <label>Contribution %:</label>
            <input
              type="number"
              value={step.contribution_pct ?? guidedDefaults.contribution_pct ?? ''}
              onChange={e => handleFloatFieldChange('contribution_pct', e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>
          <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
            <label>Hydration %:</label>
            <input
              type="number"
              value={step.target_hydration ?? guidedDefaults.target_hydration ?? ''}
              onChange={e => handleFloatFieldChange('target_hydration', e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>
          <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
            <label>Temperature (°C):</label>
            <input
              type="number"
              value={step.target_temperature_celsius ?? ''}
              onChange={e => handleFloatFieldChange('target_temperature_celsius', e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>
          <FlourMixEditor
            customizeFlourMix={step.customizeFlourMix || false}
            setCustomizeFlourMix={handleCustomizeFlourMixChange}
            flours={step.stageIngredients}
            setFlours={flours => onFlourMixChange(step.recipe_step_id || step.temp_client_id, flours)}
            availableIngredients={availableIngredients}
            fieldsDisabled={fieldsDisabled}
            customizeFlourCheckboxId={`customize-flour-mix-${index}`}
            DEFAULT_BREAD_FLOUR_ID={DEFAULT_BREAD_FLOUR_ID}
            renderInfoButton={handleInfoClick}
            onFlourMixChange={onFlourMixChange}
            stepId={step.recipe_step_id || step.temp_client_id}
          />
        </>
      )}

      {isMainMix && (
        <>
          <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
            <label>Hydration % (optional):</label>
            <input
              type="number"
              value={step.target_hydration ?? ''}
              onChange={e => handleFloatFieldChange('target_hydration', e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>
          <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
            <label>Salt % (optional):</label>
            <input
              type="number"
              value={step.salt_percentage ?? ''}
              onChange={e => handleFloatFieldChange('salt_percentage', e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>
          <FlourMixEditor
            customizeFlourMix={step.customizeFlourMix || false}
            setCustomizeFlourMix={handleCustomizeFlourMixChange}
            flours={step.stageIngredients}
            setFlours={flours => onFlourMixChange(step.recipe_step_id || step.temp_client_id, flours)}
            availableIngredients={availableIngredients}
            fieldsDisabled={fieldsDisabled}
            customizeFlourCheckboxId={`customize-flour-mix-${index}`}
            DEFAULT_BREAD_FLOUR_ID={DEFAULT_BREAD_FLOUR_ID}
            renderInfoButton={handleInfoClick}
            onFlourMixChange={onFlourMixChange}
            stepId={step.recipe_step_id || step.temp_client_id}
          />
        </>
      )}

      {isTiming && (
        <>
          <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
            <label>Duration (min):</label>
            <input
              type="number"
              value={step.duration_override || step.duration_minutes || ''}
              onChange={e => handleNumericFieldChange('duration_override', e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>
          <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
            <label>Temperature (°C):</label>
            <input
              type="number"
              value={step.target_temperature_celsius ?? ''}
              onChange={e => handleFloatFieldChange('target_temperature_celsius', e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>
          {isStretchAndFold && (
            <>
              <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                <label>Total Bulk Time (mins):</label>
                <input
                  type="number"
                  value={step.duration_override ?? ''}
                  onChange={e => handleNumericFieldChange('duration_override', e.target.value)}
                  disabled={fieldsDisabled}
                />
              </div>
              <div className={`${styles.inputGroup} ${styles.twoColumn}`}>
                <label>S&F Interval (mins):</label>
                <input
                  type="number"
                  value={step.stretch_fold_interval_minutes ?? ''}
                  onChange={e => handleNumericFieldChange('stretch_fold_interval_minutes', e.target.value)}
                  disabled={fieldsDisabled}
                />
              </div>
            </>
          )}
        </>
      )}

      <div className={styles.inputGroup}>
        <label>Notes:</label>
        <textarea
          value={step.notes || ''}
          onChange={e => handleFieldChange('notes', e.target.value)}
          disabled={fieldsDisabled}
        />
      </div>

 

      {/* Info Modal */}
      <Modal
        open={infoModal.open}
        title={infoModal.title}
        onClose={() => setInfoModal({ ...infoModal, open: false })}
      >
        <div>{infoModal.content}</div>
      </Modal>

      {/* AI Modal */}
      <Modal
        open={aiModal.open}
        title="AI Advice"
        onClose={() => setAiModal({ ...aiModal, open: false })}
      >
        {aiModal.loading && <div>Loading AI advice...</div>}
        {aiModal.error && <div style={{ color: 'red' }}>{aiModal.error}</div>}
        {!aiModal.loading && !aiModal.error && <div>{aiModal.content}</div>}
      </Modal>
    </div>
  );
}