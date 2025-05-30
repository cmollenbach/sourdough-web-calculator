// src/components/RecipeResults.js
import React from 'react';
import styles from './RecipeCalculator.module.css';

/**
 * @param {object} props
 * @param {object} props.results - The detailed calculation results object.
 * @param {number} props.results.totalFlourInRecipe
 * @param {number} props.results.totalWaterInRecipe
 * @param {number} props.results.totalSaltInRecipe
 * @param {Array<object>} props.results.prefermentsSummary - Array of preferment details.
 * @param {string} props.results.prefermentsSummary[].name - Name of the preferment.
 * @param {number} props.results.prefermentsSummary[].totalWeight - Total weight of the preferment.
 * @param {number} props.results.prefermentsSummary[].flourWeight - Flour weight in the preferment.
 * @param {number} props.results.prefermentsSummary[].waterWeight - Water weight in the preferment.
 * @param {Array<object>} props.results.prefermentsSummary[].flourBreakdown - Flour types and weights in preferment.
 * @param {string} props.results.prefermentsSummary[].flourBreakdown[].name
 * @param {number} props.results.prefermentsSummary[].flourBreakdown[].weight
 * @param {object} props.results.mainDoughAdds
 * @param {Array<object>} props.results.mainDoughAdds.flours - Flours added to the main dough.
 * @param {string} props.results.mainDoughAdds.flours[].ingredient_name
 * @param {number} props.results.mainDoughAdds.flours[].weight
 * @param {number} props.results.mainDoughAdds.water - Water added to the main dough.
 * @param {number} props.results.mainDoughAdds.salt - Salt added to the main dough.
 * @param {number} props.results.grandTotalWeight - Overall calculated dough weight.
 * @param {object} props.results.bakerPercentages
 * @param {number} props.results.bakerPercentages.hydration
 * @param {number} props.results.bakerPercentages.salt
 * @param {number} props.results.bakerPercentages.prefermentedFlour
 * @param {Array<string>} [props.results.errors] - Optional array of error messages.
 */
function RecipeResults({ results }) {
    if (!results) {
        return (
            <div className={styles.resultsGroup}>
                <h3>Recipe Calculation:</h3>
                <p>Enter recipe details to see calculations.</p>
            </div>
        );
    }

    const formatWeight = (weight) => `${weight} g`; // Assuming grams for now

    return (
        <div className={styles.resultsGroup}>
            <h3>Recipe Calculation:</h3>

            {results.errors && results.errors.length > 0 && (
                <div className={styles.calculationErrors}>
                    <h4>Calculation Issues:</h4>
                    <ul>
                        {results.errors.map((error, index) => (
                            <li key={`error-${index}`}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className={styles.resultsSection}>
                <h4>Overall Recipe Targets & Totals:</h4>
                <div className={styles.resultItem}>
                    <span>Total Flour in Recipe:</span>
                    <span>{formatWeight(results.totalFlourInRecipe)}</span>
                </div>
                <div className={styles.resultItem}>
                    <span>Total Water in Recipe:</span>
                    <span>{formatWeight(results.totalWaterInRecipe)}</span>
                </div>
                 <div className={styles.resultItem}>
                    <span>Total Salt in Recipe:</span>
                    <span>{formatWeight(results.totalSaltInRecipe)}</span>
                </div>
                 <div className={`${styles.resultItem} ${styles.total}`}>
                    <strong>Calculated Dough Weight:</strong>
                    <strong>{formatWeight(results.grandTotalWeight)}</strong>
                </div>
            </div>

            {results.prefermentsSummary && results.prefermentsSummary.length > 0 && (
                <div className={styles.resultsSection}>
                    <h4>Preferment(s) Summary:</h4>
                    {results.prefermentsSummary.map((pref, index) => (
                        <div key={`pref-${index}`} className={styles.prefermentDetail}>
                            <h5>{pref.name || `Preferment ${index + 1}`} (Contribution: {pref.contribution_pct_of_recipe_flour || 'N/A'}% of recipe flour, {pref.internal_hydration_pct || 'N/A'}% internal hydration)</h5>
                            <div className={styles.resultItem}>
                                <span>Total Weight:</span>
                                <span>{formatWeight(pref.totalWeight)}</span>
                            </div>
                            <div className={styles.resultItemSub}>
                                <span>Flour (in preferment):</span>
                                <span>{formatWeight(pref.flourWeight)}</span>
                            </div>
                            {pref.flourBreakdown && pref.flourBreakdown.length > 0 && (
                                <ul className={styles.flourBreakdownList}>
                                    {pref.flourBreakdown.map((flour, flourIdx) => (
                                        <li key={`pref-${index}-flour-${flourIdx}`}>
                                            {flour.name}: {formatWeight(flour.weight)}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className={styles.resultItemSub}>
                                <span>Water (in preferment):</span>
                                <span>{formatWeight(pref.waterWeight)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.resultsSection}>
                <h4>Main Dough Additions:</h4>
                {results.mainDoughAdds && results.mainDoughAdds.flours && results.mainDoughAdds.flours.length > 0 ? (
                    <>
                        <p style={{ margin: '0.2em 0', fontWeight: '500' }}>Flour(s) added to main dough:</p>
                        <ul className={styles.flourBreakdownList} style={{paddingLeft: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)'}}>
                            {results.mainDoughAdds.flours.map((flour, index) => (
                                <li key={`main-flour-${index}`}>
                                    {flour.ingredient_name}: {formatWeight(flour.weight)}
                                </li>
                            ))}
                        </ul>
                    </>
                ) : (
                     <div className={styles.resultItem}>
                        <span>Flour (added to main dough):</span>
                        <span>{formatWeight(0)}</span>
                    </div>
                )}
                <div className={styles.resultItem}>
                    <span>Water (added to main dough):</span>
                    <span>{formatWeight(results.mainDoughAdds?.water || 0)}</span>
                </div>
                 <div className={styles.resultItem}>
                    <span>Salt (added to main dough):</span>
                    <span>{formatWeight(results.mainDoughAdds?.salt || 0)}</span>
                </div>
            </div>


            <div className={styles.resultsSection}>
                <h4>Achieved Baker's Percentages (Final Dough):</h4>
                <div className={styles.resultItem}>
                    <span>Overall Hydration:</span>
                    <span>{results.bakerPercentages?.hydration?.toFixed(1) || 'N/A'}%</span>
                </div>
                <div className={styles.resultItem}>
                    <span>Overall Salt:</span>
                    <span>{results.bakerPercentages?.salt?.toFixed(1) || 'N/A'}%</span>
                </div>
                <div className={styles.resultItem}>
                    <span>Total Prefermented Flour:</span>
                    <span>{results.bakerPercentages?.prefermentedFlour?.toFixed(1) || 'N/A'}%</span>
                </div>
            </div>

        </div>
    );
}

export default RecipeResults;