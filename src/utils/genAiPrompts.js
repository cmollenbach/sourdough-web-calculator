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