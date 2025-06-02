export const simplifiedViewRules = {
  sectionsToHide: [
    'advancedFlourDetails',
    'autolyseSettings',
    'complexShapingInstructions',
    'environmentalFactors',
    'recipeVersioning'
  ],
  fieldsToHide: [
    'ingredient.bakersPercentage',
    'ingredient.specificAddInNotes',
    'step.detailedTimingOptions',
    'recipe.sourceLink'
  ],
  featuresToHide: [
    // Add 'aiHelp' here if you want to hide AI in simplified mode
    // Otherwise, leave it out to always show AI Help
  ],
  basicIngredients: [
    'flour', 'water', 'starter', 'salt', 'sugar', 'butter', 'eggs'
  ]
};