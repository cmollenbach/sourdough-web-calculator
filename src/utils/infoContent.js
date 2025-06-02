const LEVAIN_BUILD_STEP_NAME = 'Levain Build';

function cleanInfoText(str) {
    if (!str || typeof str !== 'string') return '';
    // Remove bolded prefix (e.g., **Something:**)
    str = str.replace(/^\*\*[^*]+?\*\*:? ?/, '');
    // Remove [cite: ...] at the end (with or without comma/space before)
    str = str.replace(/\s*\[cite:[^\]]+\]\s*$/, '');
    return str.trim();
}

export function getInfoButtonContent(termKey, stepName = '') {
    let raw = '';
    switch (termKey) {
        case 'step_name_levain_build':
            raw = `**${LEVAIN_BUILD_STEP_NAME}:** This is your preferment – a young, active mix of flour, water, and mature starter. It builds yeast population and bacterial activity, contributing significantly to leavening power, flavor complexity, and dough structure. [cite: 31, 32]`;
            break;
        case 'levain_contribution_pct':
            raw = `**Levain Contribution Percentage:** The percentage of flour in your levain relative to the total recipe flour. Typically 10-30%. Higher percentages can speed up fermentation and increase sourness. [cite: 33]`;
            break;
        case 'levain_target_hydration':
            raw = `**Levain Target Hydration:** The water content of the levain itself (e.g., 100% hydration means equal parts flour and water by weight). This affects its consistency and activity. [cite: 34]`;
            break;
        case 'autolyse':
            raw = `**Autolyse:** An optional rest period (20 mins to several hours) after mixing just flour and water. This allows flour to fully hydrate, enzymes to begin their work, and gluten to develop passively, often resulting in a more extensible and easier-to-handle dough. Salt and levain are typically added after autolyse. [cite: 36, 37]`;
            break;
        case 'bulk_fermentation_sf':
            raw = `**Bulk Fermentation (with Stretch & Folds):** The dough's first major rise. This is where significant flavor and gluten structure develop. "Stretch and Folds" are a gentle technique to build dough strength, equalize temperature, and redistribute food for the yeast. [cite: 38, 40]`;
            break;
        case 'total_bulk_time':
            raw = `**Total Bulk Time (mins):** Duration of the first major rise (bulk fermentation). Temperature heavily influences this. [cite: 39]`;
            break;
        case 'sf_interval':
            raw = `**S&F Interval (mins):** "Stretch and Folds" are a gentle technique to build dough strength, equalize temperature, and redistribute food for the yeast. This input sets their frequency during bulk fermentation. [cite: 40]`;
            break;
        case 'proofing':
            raw = `**Proofing (Final Proof):** The last rise of the shaped dough. This develops the final crumb structure and flavor. Can be done at room temperature or retarded in the refrigerator (cold proof) for enhanced flavor and scheduling flexibility. [cite: 42, 43]`;
            break;
        case 'baking':
            raw = `**Baking:** The final stage where your carefully nurtured dough is transformed into a loaf. Key considerations include oven temperature, steam during the initial phase, and baking duration to achieve the desired crust and internal doneness. [cite: 44]`;
            break;
        case 'step_duration':
            raw = `**Duration (mins):** Time is a key ingredient in sourdough! This sets the length for the current baking step. [cite: 46]`;
            break;
        case 'step_temperature':
            raw = `**Temperature (°C):** Dough temperature dictates fermentation speed. Warmer temperatures generally mean faster fermentation, while cooler temperatures slow it down, often allowing for more complex flavor development. [cite: 47, 48]`;
            break;
        case 'flour_mix_customization':
            raw = `**Flour Mix Customization:** For preferments and the final dough mix, you can create specific flour blends. Different flours (bread flour for strength, whole wheat for nutty flavor and faster fermentation, rye for distinct tang and enzymatic activity, spelt for extensibility) dramatically impact your bread. The app ensures percentages within each step's flour bill total 100%. [cite: 50, 51, 52]`;
            break;
        default:
            if (stepName) {
                if (stepName.toLowerCase().includes('mix final dough')) {
                    raw = `**${stepName}:** This step involves combining your active levain (or other preferment) with the remaining flour, water, salt, and any other inclusions to form the final dough. [cite: 35]`;
                } else if (stepName.toLowerCase().includes('soaker prep')) {
                    raw = `**${stepName}:** Soakers involve hydrating additions like seeds, grains, or dried fruit to prevent them from drawing moisture from the main dough, ensuring a balanced final texture. [cite: 45]`;
                } else if (stepName.toLowerCase().includes('scald prep')) {
                    raw = `**${stepName}:** Scalding involves cooking a portion of flour with hot water, which gelatinizes its starches. This can increase water absorption for a moister crumb and potentially extend the shelf life of the bread. [cite: 46]`;
                } else {
                    // This is the generic fallback, not hardcoded
                    raw = `**${stepName}:** General information about the "${stepName}" step. Its purpose is to [describe general purpose based on step name if possible, or provide a generic message].`;
                }
            } else {
                // FIX: Always use a string fallback for termKey before calling .replace()
                const formattedTerm = (termKey || '').replace(/_/g, ' ');
                raw = `Information about **${formattedTerm}**: [General explanation for ${formattedTerm} would go here, referencing the user manual where applicable. Example: "This defines the ${formattedTerm} for the current step."]`;
            }
    }
    return cleanInfoText(raw);
}

// Returns true only if the stepName would trigger a hardcoded info response (not the generic fallback)
export function hasHardcodedInfoForStepName(stepName) {
    if (!stepName) return false;
    const lower = stepName.toLowerCase();
    // These must match the hardcoded cases in getInfoButtonContent's default branch
    return (
        lower.includes('mix final dough') ||
        lower.includes('soaker prep') ||
        lower.includes('scald prep') ||
        lower === 'levain build' ||
        lower === 'autolyse' ||
        lower.includes('bulk fermentation') ||
        lower === 'proofing' ||
        lower === 'baking'
    );
}