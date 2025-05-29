// src/utils/recipeUtils.js

/**
 * Processes an array of recipe steps, enriching them with names from predefined steps
 * and ensuring numeric fields are correctly typed. It also assigns temporary client-side IDs
 * for new steps that don't yet have a database ID.
 *
 * @param {Array<Object>} rawSteps - The array of step objects to process.
 * @param {Array<Object>} predefinedSteps - An array of predefined step definitions from the backend.
 * @returns {Array<Object>} The processed array of step objects.
 */
export function processRecipeSteps(rawSteps, predefinedSteps = []) {
    return (rawSteps || []).map((step, index) => {
        const predefined = predefinedSteps.find(ps => ps.step_id === step.step_id);
        return {
            ...step,
            // Ensure step_name is populated, falling back to a generic name if not found
            step_name: step.step_name || (predefined ? predefined.step_name : `Unknown Step ID ${step.step_id}`),
            // Convert numeric fields from strings (if they come from form inputs) or ensure they are numbers
            duration_override: step.duration_override != null ? Number(step.duration_override) : null,
            target_temperature_celsius: step.target_temperature_celsius != null ? Number(step.target_temperature_celsius) : null,
            contribution_pct: step.contribution_pct != null ? Number(step.contribution_pct) : null,
            target_hydration: step.target_hydration != null ? Number(step.target_hydration) : null,
            stretch_fold_interval_minutes: step.stretch_fold_interval_minutes != null ? Number(step.stretch_fold_interval_minutes) : null,
            // Assign a temporary client-side ID if the step is new (doesn't have recipe_step_id)
            // and doesn't already have a temp_client_id. This is crucial for React keys and DnD.
            temp_client_id: step.recipe_step_id ? null : (step.temp_client_id || Date.now() + index + Math.random()),
        };
    });
}

/**
 * Calculates the ingredient weights for a sourdough recipe based on target dough weight,
 * hydration, salt percentage, and levain characteristics.
 *
 * @param {string|number} targetDoughWeight - The desired total weight of the dough.
 * @param {string|number} hydrationPercentage - The overall hydration percentage of the dough.
 * @param {string|number} saltPercentage - The salt percentage, based on total flour.
 * @param {Array<Object>} steps - The array of recipe steps, used to find the levain step.
 * @param {string|number|null} levainStepId - The ID of the step type that represents the levain build.
 * @returns {Object} An object containing the calculated weights for flour, water, starter, salt, and total.
 */
export function calculateRecipe(targetDoughWeight, hydrationPercentage, saltPercentage, steps = [], levainStepId) {
    // --- Input Validation and Parsing ---
    const targetDoughWeightNum = parseFloat(targetDoughWeight);
    const hydrationPercentageNum = parseFloat(hydrationPercentage) / 100.0;
    const saltPercentageNum = parseFloat(saltPercentage) / 100.0;

    // Return zeroed results if target weight is invalid
    if (isNaN(targetDoughWeightNum) || targetDoughWeightNum <= 0) {
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0 };
    }

    // Find the levain step, if provided and valid
    const levainStep = steps.find(step =>
        step.step_id === levainStepId &&
        step.contribution_pct != null &&
        step.target_hydration != null
    );

    const starterPercentageNum = levainStep ? parseFloat(levainStep.contribution_pct) / 100.0 : 0;
    const starterHydrationNum = levainStep ? parseFloat(levainStep.target_hydration) / 100.0 : 0;

    // Validate essential percentages
    if (isNaN(hydrationPercentageNum) || isNaN(saltPercentageNum)) {
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0 };
    }
    // Validate starter hydration if starter is used
    if (starterPercentageNum > 0 && (isNaN(starterHydrationNum) || (1 + starterHydrationNum) === 0)) {
         return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: 0 };
    }

    // --- Core Calculation Logic ---
    let finalFlourWeight = 0;
    let finalWaterWeight = 0;
    let finalStarterWeight = 0;
    let saltWeightValue = 0;
    let totalFlourInRecipe = 0;

    // Calculate total flour based on the sum of percentages (100% flour + hydration% + salt%)
    // Avoid division by zero if percentages sum to zero (unlikely in valid scenarios)
    if ((1 + hydrationPercentageNum + saltPercentageNum) !== 0) {
        totalFlourInRecipe = targetDoughWeightNum / (1 + hydrationPercentageNum + saltPercentageNum);
    } else if (targetDoughWeightNum > 0) {
        // Edge case: if percentages are such that denominator is zero, but target weight is positive.
        // This implies an impossible recipe, return target weight as total, others zero.
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0, totalWeight: targetDoughWeightNum };
    }


    if (starterPercentageNum > 0 && levainStep) {
        // Calculate starter weight based on its percentage of total flour
        finalStarterWeight = totalFlourInRecipe * starterPercentageNum;
        // Calculate flour and water content within the starter
        const flourInStarter = finalStarterWeight / (1 + starterHydrationNum);
        const waterInStarter = finalStarterWeight - flourInStarter;

        // Adjust main flour and water by subtracting amounts from starter
        finalFlourWeight = totalFlourInRecipe - flourInStarter;
        const totalWaterInRecipe = totalFlourInRecipe * hydrationPercentageNum;
        finalWaterWeight = totalWaterInRecipe - waterInStarter;
        // Salt is based on total flour in the recipe (including flour in starter)
        saltWeightValue = totalFlourInRecipe * saltPercentageNum;
    } else {
        // No starter, or starter details are missing; calculate based on added flour and water directly
        finalFlourWeight = totalFlourInRecipe;
        finalWaterWeight = finalFlourWeight * hydrationPercentageNum;
        saltWeightValue = finalFlourWeight * saltPercentageNum; // Salt based on this flour
        finalStarterWeight = 0;
    }

    // --- Rounding and Adjustments ---
    // Helper to round to nearest whole number, ensuring non-negative results
    const round = (num) => {
        if (isNaN(num) || !isFinite(num)) return 0;
        return Math.max(0, Math.round(num)); // Ensure non-negative
    }
    // Helper to round salt to one decimal place, ensuring non-negative
     const roundSalt = (num) => {
        if (isNaN(num) || !isFinite(num)) return 0;
        const val = parseFloat(num.toFixed(1));
        return Math.max(0, val); // Ensure non-negative
    }

    let ffw = round(finalFlourWeight);
    let fww = round(finalWaterWeight);
    let fsw = round(finalStarterWeight);
    let swv = roundSalt(saltWeightValue);

    // Adjust water to meet target dough weight more precisely,
    // compensating for accumulated rounding differences.
    let calculatedTotal = ffw + fww + fsw + swv;
    let adjustedWaterWeight = fww;
    const diff = targetDoughWeightNum - calculatedTotal;

    // Only adjust if the difference is small and meaningful,
    // and if there's flour or starter to hydrate (to avoid adding water to a zero-flour recipe).
    if (Math.abs(diff) > 0.1 && Math.abs(diff) < 25) { // Threshold for adjustment
        if (ffw > 0 || fsw > 0) {
             adjustedWaterWeight = round(fww + diff); // Add or subtract difference from water
        }
    }
    calculatedTotal = ffw + adjustedWaterWeight + fsw + swv;

    return {
        flourWeight: ffw,
        waterWeight: adjustedWaterWeight,
        starterWeight: fsw,
        saltWeight: swv,
        totalWeight: round(calculatedTotal) // Final rounding for total weight
    };
}


/**
 * Generates a unique ID for a recipe step, prioritizing existing database IDs
 * over temporary client-side IDs. This is crucial for React keys and drag-and-drop functionality.
 * @param {Object} step - The recipe step object.
 * @returns {string|number} The unique ID for the step.
 */
export const getStepDnDId = (step) => step.recipe_step_id || step.temp_client_id;