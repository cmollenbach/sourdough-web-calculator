// src/utils/recipeUtils.js

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
            duration_override: step.duration_override != null ? Number(step.duration_override) : null,
            target_temperature_celsius: step.target_temperature_celsius != null ? parseFloat(step.target_temperature_celsius) : null,
            contribution_pct: step.contribution_pct != null ? parseFloat(step.contribution_pct) : null,
            target_hydration: step.target_hydration != null ? parseFloat(step.target_hydration) : null,
            stretch_fold_interval_minutes: step.stretch_fold_interval_minutes != null ? Number(step.stretch_fold_interval_minutes) : null,
            stageIngredients: Array.isArray(step.stageIngredients)
                ? step.stageIngredients.map(ing => ({
                    ...ing,
                    ingredient_id: Number(ing.ingredient_id),
                    percentage: ing.percentage != null ? parseFloat(ing.percentage) : null,
                    is_wet: typeof ing.is_wet === 'boolean' ? ing.is_wet : false,
                }))
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

    if (isNaN(targetDoughWeightNum) || targetDoughWeightNum <= 0 ||
        isNaN(overallHydrationNum) || overallHydrationNum < 0 ||
        isNaN(overallSaltNum) || overallSaltNum < 0) {
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
    steps.forEach(step => {
        const isPreferment = step.step_type === 'Levain' || step.step_type === 'Preferment' ||
            (stepTypeIds.levainBuild && Number(step.step_id) === stepTypeIds.levainBuild) ||
            (stepTypeIds.poolishBuild && Number(step.step_id) === stepTypeIds.poolishBuild) ||
            (stepTypeIds.bigaBuild && Number(step.step_id) === stepTypeIds.bigaBuild);

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

    const mainDoughMixStep = steps.find(step => Number(step.step_id) === stepTypeIds.mixFinalDough || step.step_type === 'Mixing');

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

    results.prefermentsSummary = results.prefermentsSummary.map(p => ({
        ...p,
        totalWeight: round(p.totalWeight),
        flourWeight: round(p.flourWeight),
        waterWeight: round(p.waterWeight),
        flourBreakdown: p.flourBreakdown.map(f => ({ ...f, weight: round(f.weight) })),
    }));

    results.mainDoughAdds.flours = results.mainDoughAdds.flours.map(f => ({ ...f, weight: round(f.weight) }));
    results.mainDoughAdds.water = round(results.mainDoughAdds.water);
    results.mainDoughAdds.salt = round1Decimal(results.mainDoughAdds.salt);

    let finalCalculatedWeight = results.mainDoughAdds.salt + results.mainDoughAdds.water;
    results.mainDoughAdds.flours.forEach(f => finalCalculatedWeight += f.weight);
    results.prefermentsSummary.forEach(p => {
        finalCalculatedWeight += p.totalWeight;
    });

    const weightDifference = targetDoughWeightNum - finalCalculatedWeight;
    const totalFlourInFinalDoughMix = results.mainDoughAdds.flours.reduce((sum, f) => sum + f.weight, 0) +
        results.prefermentsSummary.reduce((sum, p) => sum + p.flourWeight, 0);

    if (Math.abs(weightDifference) >= 0.1 && Math.abs(weightDifference) < Math.max(25, targetDoughWeightNum * 0.025)) {
        if (totalFlourInFinalDoughMix > 0 || results.mainDoughAdds.water > 0) {
            results.mainDoughAdds.water = round(results.mainDoughAdds.water + weightDifference);
            finalCalculatedWeight += weightDifference;
        } else if (results.prefermentsSummary.some(p => p.waterWeight > 0 && p.totalWeight + weightDifference >= p.flourWeight)) {
            // ...
        }
    }
    results.grandTotalWeight = round(finalCalculatedWeight);

    actualTotalWater = results.prefermentsSummary.reduce((sum, p) => sum + p.waterWeight, 0) + results.mainDoughAdds.water;
    results.totalWaterInRecipe = round(actualTotalWater);

    if (results.totalFlourInRecipe > 0) {
        results.bakerPercentages.hydration = parseFloat(((results.totalWaterInRecipe / results.totalFlourInRecipe) * 100).toFixed(1));
    } else {
        results.bakerPercentages.hydration = parseFloat(overallHydrationPercentage);
    }

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
export function normalizeStepFlours(steps, defaultFlourId) {
    steps = Array.isArray(steps) ? steps : [];
    return steps.map(step => {
        const needsFlour =
            step.step_type === 'Mixing' ||
            step.step_type === 'Levain' ||
            step.step_type === 'Preferment' ||
            step.step_name?.toLowerCase().includes('dough') ||
            step.step_name?.toLowerCase().includes('levain');

        if (needsFlour) {
            if (step.customizeFlourMix) {
                return {
                    ...step,
                    stageIngredients: Array.isArray(step.stageIngredients) ? step.stageIngredients : [],
                };
            } else {
                return {
                    ...step,
                    stageIngredients: [{
                        ingredient_id: defaultFlourId,
                        percentage: 100,
                    }],
                };
            }
        }
        return step;
    });
}