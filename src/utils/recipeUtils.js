// src/utils/recipeUtils.js

export const DEFAULT_BREAD_FLOUR_ID = 1;

/**
 * Processes an array of recipe steps, enriching them with names from predefined steps,
 * ensuring numeric fields are correctly typed, initializing stageIngredients array,
 * and assigning temporary client-side IDs.
 */
export function processRecipeSteps(rawSteps, predefinedSteps = []) {
    return (rawSteps || []).map((step, index) => {
        const predefined = predefinedSteps.find(ps => ps.step_id === step.step_id);
        return {
            ...step,
            step_name: step.step_name || (predefined ? predefined.step_name : `Unknown Step ID ${step.step_id}`),
            step_type: step.step_type || (predefined ? predefined.step_type : 'Unknown'),
            stageIngredients: Array.isArray(step.stageIngredients)
                ? step.stageIngredients
                : [],
            temp_client_id: step.recipe_step_id ? null : (step.temp_client_id || Date.now() + index + Math.random()),
        };
    });
}

/**
 * Calculates ingredient weights for a sourdough recipe with multiple preferments and flour types per stage.
 * All percentages are expected as whole numbers (e.g., 75 for 75%, 2.0 for 2.0%).
 */
export function calculateRecipe(
    overallTargetDoughWeight,
    overallHydrationPercentage,
    overallSaltPercentage,
    steps = [],
    availableIngredients = [],
    stepTypeIds = {}
) {
    const targetDoughWeightNum = parseFloat(overallTargetDoughWeight);
    const overallHydrationNum = parseFloat(overallHydrationPercentage) / 100.0;
    const overallSaltNum = parseFloat(overallSaltPercentage) / 100.0;

    const results = {
        totalFlourInRecipe: 0,
        totalWaterInRecipe: 0,
        totalSaltInRecipe: 0,
        prefermentsSummary: [],
        mainDoughAdds: {
            flours: [],
            water: 0,
            salt: 0,
        },
        grandTotalWeight: 0,
        bakerPercentages: {
            hydration: parseFloat(overallHydrationPercentage),
            salt: parseFloat(overallSaltPercentage),
            prefermentedFlour: 0,
        },
        errors: [],
    };

    if (
        isNaN(targetDoughWeightNum) || targetDoughWeightNum <= 0 ||
        isNaN(overallHydrationNum) || overallHydrationNum < 0 ||
        isNaN(overallSaltNum) || overallSaltNum < 0
    ) {
        results.errors.push("Invalid overall recipe parameters (Target Weight, Hydration, or Salt).");
        return results;
    }

    // 1. Estimate Total Flour in the entire Recipe
    let totalFlourInRecipe = targetDoughWeightNum / (1 + overallHydrationNum + overallSaltNum);
    if (totalFlourInRecipe <= 0 || !isFinite(totalFlourInRecipe)) {
        results.errors.push("Could not determine a valid total flour amount from overall parameters.");
        totalFlourInRecipe = 0;
        results.totalFlourInRecipe = 0;
        results.totalWaterInRecipe = 0;
        results.totalSaltInRecipe = 0;
        results.grandTotalWeight = 0;
        return results;
    }
    results.totalFlourInRecipe = totalFlourInRecipe;
    results.totalWaterInRecipe = totalFlourInRecipe * overallHydrationNum;
    results.totalSaltInRecipe = totalFlourInRecipe * overallSaltNum;

    let accumulatedFlourFromPreferments = 0;
    let accumulatedWaterFromPreferments = 0;
    let totalPrefermentedFlourPercentOfRecipe = 0;

    // 2. Calculate Preferments
    (steps || []).forEach(step => {
        const type = (step.step_type || '').toLowerCase();
        const name = (step.step_name || '').toLowerCase();

        const isPreferment =
            type.includes('levain') ||
            type.includes('preferment') ||
            name.includes('levain') ||
            name.includes('preferment') ||
            (stepTypeIds.levainBuild && Number(step.step_id) === stepTypeIds.levainBuild) ||
            (stepTypeIds.poolishBuild && Number(step.step_id) === stepTypeIds.poolishBuild) ||
            (stepTypeIds.bigaBuild && Number(step.step_id) === stepTypeIds.bigaBuild);

        if (
          isPreferment &&
          (step.contribution_pct === undefined || step.contribution_pct === null || isNaN(step.contribution_pct) ||
           step.target_hydration === undefined || step.target_hydration === null || isNaN(step.target_hydration))
        ) {
            results.errors.push(`${step.step_name || 'Preferment'} step requires Contribution % and Internal Hydration %.`);
            return;
        }

        if (!isPreferment || !step.contribution_pct || !step.target_hydration) {
            return;
        }

        const contributionPct = parseFloat(step.contribution_pct) / 100.0;
        const prefermentTargetHydrationNum = parseFloat(step.target_hydration) / 100.0;

        if (contributionPct <= 0) return;

        totalPrefermentedFlourPercentOfRecipe += parseFloat(step.contribution_pct);

        const prefermentFlourTarget = totalFlourInRecipe * contributionPct;
        let prefermentWaterTarget = 0;
        let currentPrefermentFlourTotalFromDef = 0;
        const prefermentFlourBreakdown = [];

        let sumOfFlourPercentagesInPreferment = 0;
        (step.stageIngredients || []).forEach(ing => {
            const ingInfo = availableIngredients.find(i => i.ingredient_id === Number(ing.ingredient_id));
            if (ingInfo && !ingInfo.is_wet) {
                sumOfFlourPercentagesInPreferment += Number(ing.percentage) || 0;
            }
        });

        if (sumOfFlourPercentagesInPreferment === 0 && prefermentFlourTarget > 0) {
            results.errors.push(`Preferment step "${step.step_name}" has ${step.contribution_pct}% contribution but no flours defined or their percentages sum to zero.`);
            return;
        }

        (step.stageIngredients || []).forEach(ing => {
            const ingInfo = availableIngredients.find(i => i.ingredient_id === Number(ing.ingredient_id));
            if (!ingInfo) return;

            if (!ingInfo.is_wet) {
                const ingPctOfPrefermentFlour = sumOfFlourPercentagesInPreferment > 0
                    ? (Number(ing.percentage) || 0) / sumOfFlourPercentagesInPreferment
                    : 0;
                const weight = prefermentFlourTarget * ingPctOfPrefermentFlour;
                prefermentFlourBreakdown.push({ ingredient_id: ing.ingredient_id, name: ingInfo.ingredient_name, weight: weight });
                currentPrefermentFlourTotalFromDef += weight;
            }
        });

        prefermentWaterTarget = currentPrefermentFlourTotalFromDef * prefermentTargetHydrationNum;

        accumulatedFlourFromPreferments += currentPrefermentFlourTotalFromDef;
        accumulatedWaterFromPreferments += prefermentWaterTarget;

        results.prefermentsSummary.push({
            name: step.step_name,
            type: step.step_type,
            totalWeight: currentPrefermentFlourTotalFromDef + prefermentWaterTarget,
            flourWeight: currentPrefermentFlourTotalFromDef,
            waterWeight: prefermentWaterTarget,
            flourBreakdown: prefermentFlourBreakdown,
            contribution_pct_of_recipe_flour: step.contribution_pct,
            internal_hydration_pct: step.target_hydration,
        });
    });
    results.bakerPercentages.prefermentedFlour = totalPrefermentedFlourPercentOfRecipe;

    // 3. Calculate Main Dough Additions
    const flourNeededForMainDough = Math.max(0, results.totalFlourInRecipe - accumulatedFlourFromPreferments);
    const waterNeededForMainDough = Math.max(0, results.totalWaterInRecipe - accumulatedWaterFromPreferments);
    const saltForMainDough = results.totalSaltInRecipe;

    results.mainDoughAdds.water = waterNeededForMainDough;
    results.mainDoughAdds.salt = saltForMainDough;

    const mainDoughMixStep = (steps || []).find(step => Number(step.step_id) === stepTypeIds.mixFinalDough || step.step_type === 'Mixing');

    if (mainDoughMixStep && flourNeededForMainDough > 0) {
        let sumOfFlourPercentagesInMainDough = 0;
        const mainDoughFlourIngredients = (mainDoughMixStep.stageIngredients || []).filter(ing => {
            const ingInfo = availableIngredients.find(i => i.ingredient_id === Number(ing.ingredient_id));
            return ingInfo && !ingInfo.is_wet && ingInfo.ingredient_name?.toLowerCase() !== 'salt';
        });

        mainDoughFlourIngredients.forEach(ing => {
            sumOfFlourPercentagesInMainDough += Number(ing.percentage) || 0;
        });

        if (sumOfFlourPercentagesInMainDough === 0 && mainDoughFlourIngredients.length > 0) {
            results.errors.push(`Main dough mix step "${mainDoughMixStep.step_name}" has flours defined but their percentages sum to zero.`);
        }

        if (sumOfFlourPercentagesInMainDough > 0) {
            mainDoughFlourIngredients.forEach(ing => {
                const ingInfo = availableIngredients.find(i => i.ingredient_id === Number(ing.ingredient_id));
                const ingPctOfMainDoughFlour = (Number(ing.percentage) || 0) / sumOfFlourPercentagesInMainDough;
                const weight = flourNeededForMainDough * ingPctOfMainDoughFlour;
                results.mainDoughAdds.flours.push({
                    ingredient_id: ing.ingredient_id,
                    ingredient_name: ingInfo.ingredient_name,
                    weight: weight,
                    percentageOfMainDoughFlour: ing.percentage,
                });
            });
        } else if (flourNeededForMainDough > 0 && mainDoughFlourIngredients.length === 0) {
            results.errors.push(`Flour is required for the main dough, but no flour ingredients are defined in the '${mainDoughMixStep.step_name}' step. Assigning to default flour.`);
            const defaultFlour = availableIngredients.find(ing => !ing.is_wet && ing.ingredient_name?.toLowerCase().includes('flour'));
            if (defaultFlour) {
                results.mainDoughAdds.flours.push({
                    ingredient_id: defaultFlour.ingredient_id,
                    ingredient_name: defaultFlour.ingredient_name,
                    weight: flourNeededForMainDough,
                    percentageOfMainDoughFlour: 100,
                });
            } else {
                results.errors.push("No default flour found to assign remaining main dough flour.");
            }
        }
    } else if (flourNeededForMainDough > 0 && !mainDoughMixStep) {
        results.errors.push("Main dough requires flour, but no 'Mix Final Dough' step found. Assigning to default flour.");
        const defaultFlour = availableIngredients.find(ing => !ing.is_wet && ing.ingredient_name?.toLowerCase().includes('flour'));
        if (defaultFlour) {
            results.mainDoughAdds.flours.push({
                ingredient_id: defaultFlour.ingredient_id,
                ingredient_name: defaultFlour.ingredient_name,
                weight: flourNeededForMainDough,
                percentageOfMainDoughFlour: 100,
            });
        } else {
            results.errors.push("No default flour found to assign remaining main dough flour and no mix step defined.");
        }
    }

    // Rounding and Final Totals
    const round = (num) => (isNaN(num) || !isFinite(num)) ? 0 : Math.max(0, Math.round(num));
    const round1Decimal = (num) => (isNaN(num) || !isFinite(num)) ? 0 : Math.max(0, parseFloat(num.toFixed(1)));

    results.totalFlourInRecipe = round(results.totalFlourInRecipe);

    let actualTotalWater = accumulatedWaterFromPreferments + (results.mainDoughAdds.water || 0);

    results.prefermentsSummary = (results.preferentsSummary || []).map(p => ({
        ...p,
        totalWeight: round(p.totalWeight),
        flourWeight: round(p.flourWeight),
        waterWeight: round(p.waterWeight),
        flourBreakdown: (p.flourBreakdown || []).map(f => ({ ...f, weight: round(f.weight) })),
    }));

    results.mainDoughAdds.flours = (results.mainDoughAdds.flours || []).map(f => ({ ...f, weight: round(f.weight) }));
    results.mainDoughAdds.water = round(results.mainDoughAdds.water);
    results.mainDoughAdds.salt = round1Decimal(results.mainDoughAdds.salt);

    let finalCalculatedWeight = results.mainDoughAdds.salt + results.mainDoughAdds.water;
    (results.mainDoughAdds.flours || []).forEach(f => finalCalculatedWeight += f.weight);
    (results.prefermentsSummary || []).forEach(p => {
        finalCalculatedWeight += p.totalWeight;
    });

    const weightDifference = targetDoughWeightNum - finalCalculatedWeight;
    const totalFlourInFinalDoughMix = (results.mainDoughAdds.flours || []).reduce((sum, f) => sum + f.weight, 0) +
        (results.preferentsSummary || []).reduce((sum, p) => sum + p.flourWeight, 0);

    if (Math.abs(weightDifference) >= 0.1 && Math.abs(weightDifference) < Math.max(25, targetDoughWeightNum * 0.025)) {
        if (totalFlourInFinalDoughMix > 0 || results.mainDoughAdds.water > 0) {
            results.mainDoughAdds.water = round(results.mainDoughAdds.water + weightDifference);
            finalCalculatedWeight += weightDifference;
        } else if ((results.preferentsSummary || []).some(p => p.waterWeight > 0 && p.totalWeight + weightDifference >= p.flourWeight)) {
            // ...
        }
    }
    results.grandTotalWeight = round(finalCalculatedWeight);

    actualTotalWater = (results.preferentsSummary || []).reduce((sum, p) => sum + p.waterWeight, 0) + results.mainDoughAdds.water;
    results.totalWaterInRecipe = round(actualTotalWater);

    if (results.totalFlourInRecipe > 0) {
        results.bakerPercentages.hydration = parseFloat(((results.totalWaterInRecipe / results.totalFlourInRecipe) * 100).toFixed(1));
    } else {
        results.bakerPercentages.hydration = parseFloat(overallHydrationPercentage);
    }

    // Build stepBreakdown for UI
    results.stepBreakdown = (steps || []).map(step => {
        // Build ingredient breakdown for this step
        let ingredients = [];
        // Preferment steps
        const prefermentSummary = (results.preferentsSummary || []).find(p => p.name === step.step_name);
        if (prefermentSummary) {
            // Preferment: use flour breakdown and water
            ingredients = [
                ...(prefermentSummary.flourBreakdown || []).map(f => ({
                    ingredient_id: f.ingredient_id,
                    ingredient_name: f.name,
                    grams: f.weight,
                    percentage: null
                })),
                {
                    ingredient_id: null,
                    ingredient_name: 'Water',
                    grams: prefermentSummary.waterWeight,
                    percentage: null
                }
            ];
        } else if (step.step_type === 'Mixing' || step.step_name?.toLowerCase().includes('mix')) {
            // Main dough mix step
            ingredients = [
                ...(results.mainDoughAdds.flours || []).map(f => ({
                    ingredient_id: f.ingredient_id,
                    ingredient_name: f.ingredient_name,
                    grams: f.weight,
                    percentage: f.percentageOfMainDoughFlour
                })),
                {
                    ingredient_id: null,
                    ingredient_name: 'Water',
                    grams: results.mainDoughAdds.water,
                    percentage: null
                },
                {
                    ingredient_id: null,
                    ingredient_name: 'Salt',
                    grams: results.mainDoughAdds.salt,
                    percentage: null
                }
            ];
        } else {
            // Other steps: fallback to stageIngredients with calculated_weight if present
            ingredients = (step.stageIngredients || []).map(ing => ({
                ingredient_id: ing.ingredient_id,
                ingredient_name: ing.ingredient_name,
                grams: ing.calculated_weight || null,
                percentage: ing.percentage
            }));
        }

        return {
            step_id: step.step_id,
            step_order: step.step_order,
            step_name: step.step_name,
            ingredients
        };
    });

    return results;
}

/**
 * Generates a unique ID for a recipe step, prioritizing existing database IDs
 * over temporary client-side IDs. This is crucial for React keys and drag-and-drop functionality.
 */
export const getStepDnDId = (step) => step.recipe_step_id || step.temp_client_id;

/**
 * Ensures each step has correct flour ingredients:
 * - If customFlourMix is true, use the selected flours.
 * - If customFlourMix is false, inject the default flour at 100%.
 */
export function normalizeStepFlours(steps, defaultFlourId = DEFAULT_BREAD_FLOUR_ID) {
    return (steps || []).map(step => {
        const type = (step.step_type || '').toLowerCase();
        const name = (step.step_name || '').toLowerCase();

        // Steps that need flour
        const needsFlour =
            type.includes('mix') ||
            type.includes('levain') ||
            type.includes('preferment') ||
            name.includes('dough') ||
            name.includes('levain');

        // If user customized, respect their mix if at least one flour is present and >0%
        const hasCustomFlour = step.customizeFlourMix && Array.isArray(step.stageIngredients) &&
            step.stageIngredients.some(ing => (Number(ing.percentage) || 0) > 0);

        if (needsFlour) {
            if (hasCustomFlour) {
                return step;
            }
            // Otherwise, inject Bread Flour
            return {
                ...step,
                stageIngredients: [{
                    ingredient_id: defaultFlourId,
                    percentage: 100,
                    ingredient_name: 'Bread Flour',
                    is_wet: false
                }]
            };
        }
        // For non-flour steps, leave as is
        return step;
    });
}

/**
 * Assigns all relevant ingredients (flour, water, salt, levain) to each step's stageIngredients.
 * @param {Array} steps - The array of recipe steps.
 * @param {Array} availableIngredients - All available ingredients (from backend).
 * @param {Object} stepTypeIds - IDs for special steps (levain, mix, autolyse, etc).
 * @returns {Array} New steps array with updated stageIngredients.
 */
export function assignStageIngredientsToSteps(steps, availableIngredients, stepTypeIds = {}) {
  return steps.map((step) => {
    // Clone to avoid mutation
    let newStep = { ...step, stageIngredients: Array.isArray(step.stageIngredients) ? [...step.stageIngredients] : [] };

    // Helper to find ingredient by name/type
    const findIngredient = (name, isWet = null) =>
      availableIngredients.find(
        ing =>
          ing.ingredient_name.trim().toLowerCase() === name.trim().toLowerCase() &&
          (isWet === null || ing.is_wet === isWet)
      );

    // IDs for common ingredients
    const flourIds = availableIngredients
      .filter(ing => !ing.is_wet && ing.ingredient_name.trim().toLowerCase() !== 'salt')
      .map(ing => ing.ingredient_id);
    const water = findIngredient('water', true);
    const salt = findIngredient('salt', false);
    const levain = findIngredient('levain', false) || findIngredient('starter', false);

    // Step type detection (prefer id/type, fallback to name)
    const stepName = step.step_name?.toLowerCase() || '';
    const isMainMix = stepName.includes('final mix') || stepName.includes('main mix');
    const isAutolyse = stepName.includes('autolyse');
    const isLevain = stepName.includes('levain');

    if (isMainMix) {
      newStep.stageIngredients = [
        ...flourIds.map(fid => ({
          ingredient_id: fid,
          percentage: newStep.stageIngredients.find(si => si.ingredient_id === fid)?.percentage ?? 100,
          is_wet: false
        })),
        ...(water ? [{
          ingredient_id: water.ingredient_id,
          percentage: step.water_percentage ?? null,
          is_wet: true
        }] : []),
        ...(salt ? [{
          ingredient_id: salt.ingredient_id,
          percentage: step.salt_percentage ?? null,
          is_wet: false
        }] : []),
        ...(levain ? [{
          ingredient_id: levain.ingredient_id,
          percentage: step.levain_percentage ?? null,
          is_wet: false
        }] : []),
      ].filter(ing => ing.percentage !== null && ing.percentage !== undefined);
    } else if (isAutolyse) {
      newStep.stageIngredients = [
        ...flourIds.map(fid => ({
          ingredient_id: fid,
          percentage: newStep.stageIngredients.find(si => si.ingredient_id === fid)?.percentage ?? 100,
          is_wet: false
        })),
        ...(water ? [{
          ingredient_id: water.ingredient_id,
          percentage: step.water_percentage ?? null,
          is_wet: true
        }] : []),
        ...(levain ? [{
          ingredient_id: levain.ingredient_id,
          percentage: step.levain_percentage ?? null,
          is_wet: false
        }] : []),
      ].filter(ing => ing.percentage !== null && ing.percentage !== undefined);
    } else if (isLevain) {
      newStep.stageIngredients = [
        ...flourIds.map(fid => ({
          ingredient_id: fid,
          percentage: newStep.stageIngredients.find(si => si.ingredient_id === fid)?.percentage ?? 100,
          is_wet: false
        })),
        ...(water ? [{
          ingredient_id: water.ingredient_id,
          percentage: step.water_percentage ?? null,
          is_wet: true
        }] : []),
        ...(levain ? [{
          ingredient_id: levain.ingredient_id,
          percentage: step.levain_percentage ?? null,
          is_wet: false
        }] : []),
      ].filter(ing => ing.percentage !== null && ing.percentage !== undefined);
    }
    // Add more rules for inclusions, toppings, etc. as needed

    return newStep;
  });
}

/**
 * Normalizes recipe steps for saving to the database, ensuring only relevant fields are included
 * and applying defaults for certain step types (e.g., Levain).
 */
export function normalizeRecipeStepsForSave(steps, currentRecipeId, isInTemplateMode) {
    const normalizedSteps = normalizeStepFlours(steps, DEFAULT_BREAD_FLOUR_ID);

    return normalizedSteps.map(step => {
        let stageIngredients = Array.isArray(step.stageIngredients) ? step.stageIngredients : [];
        if (stageIngredients.length === 0) {
            stageIngredients = [{
                ingredient_id: DEFAULT_BREAD_FLOUR_ID,
                percentage: 100,
                ingredient_name: 'Bread Flour',
                is_wet: false
            }];
        }

        const isLevain = (step.step_type || '').toLowerCase().includes('levain') ||
            (step.step_name || '').toLowerCase().includes('levain');

        const stepData = {
            step_id: step.step_id,
            step_order: step.step_order,
            duration_override: step.duration_override,
            notes: step.notes,
            target_temperature_celsius: step.target_temperature_celsius,
            stretch_fold_interval_minutes: step.stretch_fold_interval_minutes,
            stageIngredients,
        };

        if (isLevain) {
            stepData.contribution_pct = step.contribution_pct != null ? Number(step.contribution_pct) : 20;
            stepData.target_hydration = step.target_hydration != null ? Number(step.target_hydration) : 100;
        }
        if (currentRecipeId && !isInTemplateMode && step.recipe_step_id) {
            stepData.recipe_step_id = step.recipe_step_id;
        }
        return stepData;
    });
}