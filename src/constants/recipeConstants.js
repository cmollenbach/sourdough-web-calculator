// src/constants/recipeConstants.js

/**
 * The name identifier for the Levain Build step.
 * Used to dynamically find and apply specific logic or defaults for this step type.
 */
export const LEVAIN_BUILD_STEP_NAME = 'Levain Build';

/**
 * Initial state for the main recipe input fields.
 * Used when clearing the form or initializing a new recipe.
 */
export const INITIAL_RECIPE_FIELDS = {
    recipe_id: null,
    recipe_name: 'My New Sourdough',
    description: '',
    targetDoughWeight: '1000', // Default target dough weight in grams
    hydrationPercentage: '70', // Default overall hydration percentage
    saltPercentage: '2.0',     // Default salt percentage based on total flour
    steps: []                  // Initial steps array is empty
};

/**
 * Default template for a "Levain Build" step.
 * This is used when adding a new levain step or when a predefined levain step
 * from the backend might be missing specific default values.
 */
export const DEFAULT_LEVAIN_STEP_TEMPLATE = {
    step_name: LEVAIN_BUILD_STEP_NAME,
    duration_override: null, // Duration can vary; null means use predefined default or user sets
    notes: 'Build the levain for the main dough.',
    target_temperature_celsius: 24, // Typical room temperature for levain build
    contribution_pct: 20,           // Default percentage of levain relative to total flour
    target_hydration: 100,          // Default hydration for the levain itself (e.g., 100% means equal parts flour and water)
};