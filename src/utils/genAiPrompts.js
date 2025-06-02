import { LEVAIN_BUILD_STEP_NAME } from '../constants/recipeConstants';

export function getGenAiPrompt(termKey, stepName = '') {
    switch (termKey) {
        case 'step_name_levain_build':
            return `Explain what a "Levain Build" is in the context of sourdough baking...`;
        case 'levain_contribution_pct':
            return `Explain "Levain Contribution Percentage" in sourdough baking...`;
        case 'levain_target_hydration':
            return `Explain "Levain Target Hydration" in sourdough baking...`;
        case 'autolyse':
            return `What is "Autolyse" in sourdough bread making?...`;
        case 'bulk_fermentation_sf':
            return `Explain "Bulk Fermentation with Stretch and Fold" in sourdough baking...`;
        case 'total_bulk_time':
            return `Explain the importance of "Total Bulk Time" in sourdough baking...`;
        case 'sf_interval':
            return `What is the "S&F Interval (Stretch and Fold Interval)"...`;
        case 'proofing':
            return `Explain "Proofing" (or final proof) in sourdough baking...`;
        case 'baking':
            return `Provide a general explanation of the "Baking" stage for sourdough bread...`;
        case 'step_duration':
            return `Explain how "Duration (mins)" impacts various sourdough steps...`;
        case 'step_temperature':
            return `Explain the importance of "Temperature (°C)" in sourdough baking...`;
        case 'flour_mix_customization':
            return `Explain the concept of using a custom flour mix in sourdough steps...`;
        default:
            if (stepName) return `Explain the sourdough baking step or concept: "${stepName}". What is its purpose and typical process?`;
            return `Explain the sourdough baking concept: "${termKey.replace(/_/g, ' ')}".`;
    }
}

export function getTermKeyForStepName(name) {
    if (name === LEVAIN_BUILD_STEP_NAME) return 'step_name_levain_build';
    if (name === 'Autolyse') return 'autolyse';
    if (name === 'Bulk Fermentation with Stretch and Fold') return 'bulk_fermentation_sf';
    if (name === 'Proofing') return 'proofing';
    if (name === 'Baking') return 'baking';
    return name;
}

export function shouldShowInfoForStepName(name) {
    const notableStepNames = [
        LEVAIN_BUILD_STEP_NAME,
        'Autolyse',
        'Bulk Fermentation with Stretch and Fold',
        'Proofing',
        'Baking'
    ];
    return notableStepNames.includes(name);
}

export function buildFermentationPrompt(step, recipe, availableIngredients = []) {
  // Build flour description (handles multiple flours)
  let flourDesc = "Standard bread flour";
  if (step.stageIngredients && step.stageIngredients.length > 0) {
    const flourLines = step.stageIngredients
      .filter(ing => {
        const info = availableIngredients.find(ai => ai.ingredient_id === ing.ingredient_id);
        return info && !info.is_wet;
      })
      .map(ing => {
        const info = availableIngredients.find(ai => ai.ingredient_id === ing.ingredient_id);
        return info
          ? `${info.ingredient_name} (${ing.percentage}% of flour)`
          : `Unknown flour (${ing.percentage}%)`;
      });
    if (flourLines.length > 0) {
      flourDesc = flourLines.join(', ');
    }
  }

  const starter = recipe.starterDescription || "It's active and has been recently fed.";
  const inoculation = step.contribution_pct ? `${step.contribution_pct}% starter (relative to flour weight)` : "unknown inoculation";
  const salt = recipe.saltPercentage ? `${recipe.saltPercentage}% salt (relative to flour weight)` : "unknown salt %";
  const temperature = step.target_temperature_celsius
    ? `My room (and dough) temperature is consistently around ${step.target_temperature_celsius}°C`
    : "Room temperature is typical for sourdough";
  const hydration = recipe.target_hydration ? `${recipe.target_hydration}% hydration` : null;

  return `
Hi there! I'm looking for some guidance on bulk fermentation time for my sourdough.

Here are my current conditions:

Starter: ${starter}
Inoculation: I'm using ${inoculation}.
Flour: ${flourDesc}.
${hydration ? `Hydration: ${hydration}.` : ""}
Salt: ${salt}.
Temperature: ${temperature}.

Given these parameters, could you help me estimate:

An approximate bulk fermentation time?
What are the key visual cues or dough characteristics I should be looking for to know when bulk fermentation is complete and the dough is ready for shaping?
I'd appreciate it if the advice is concise and gives clear, actionable steps.
`.trim();
}