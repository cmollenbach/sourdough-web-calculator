// src/components/RecipeResults.js
import React from 'react';
import styles from './RecipeCalculator.module.css';

/**
 * @param {object} props
 * @param {object} props.results - The detailed calculation results object.
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

    const formatWeight = (weight) =>
        typeof weight === 'number' && !isNaN(weight) ? `${weight} g` : '';

    // Gather all flour names used in preferments and main dough
    const allFlourNames = [
        ...(results.prefermentsSummary?.flatMap(pref =>
            pref.flourBreakdown?.map(fb => fb.name) || []
        ) || []),
        ...(results.mainDoughAdds?.flours?.map(f => f.ingredient_name) || []),
    ];
    // Unique flour names, preserving order
    const uniqueFlourNames = Array.from(new Set(allFlourNames));

    // Table columns: Preferments (by name), Main Dough, and Total
    const stepColumns = [
        ...(results.prefermentsSummary?.map(pref => ({
            key: `pref-${pref.name}`,
            label: pref.name || 'Preferment',
            flourBreakdown: pref.flourBreakdown || [],
            flourWeight: pref.flourWeight,
            waterWeight: pref.waterWeight,
            totalWeight: pref.totalWeight,
        })) || []),
        {
            key: 'main-dough',
            label: 'Main Dough',
            flourBreakdown: results.mainDoughAdds?.flours || [],
            flourWeight: results.mainDoughAdds?.flours?.reduce((sum, f) => sum + (f.weight || 0), 0) || 0,
            waterWeight: results.mainDoughAdds?.water || 0,
            saltWeight: results.mainDoughAdds?.salt || 0,
            totalWeight:
                (results.mainDoughAdds?.flours?.reduce((sum, f) => sum + (f.weight || 0), 0) || 0) +
                (results.mainDoughAdds?.water || 0) +
                (results.mainDoughAdds?.salt || 0),
        },
    ];

    // Helper to get flour weight for a column and flour name
    function getFlourWeight(col, flourName) {
        const flour = col.flourBreakdown.find(fb =>
            (fb.name || fb.ingredient_name) === flourName
        );
        return flour ? flour.weight || flour.amount || flour.grams : '';
    }

    // Calculate totals for each flour across all steps
    function getFlourTotal(flourName) {
        return stepColumns.reduce((sum, col) => {
            const w = getFlourWeight(col, flourName);
            return sum + (typeof w === 'number' ? w : 0);
        }, 0);
    }

    // Calculate total flour, water, salt, and overall total
    const totalFlour = stepColumns.reduce((sum, col) => sum + (col.flourWeight || 0), 0);
    const totalWater = stepColumns.reduce((sum, col) => sum + (col.waterWeight || 0), 0);
    const totalSalt = stepColumns.reduce((sum, col) => sum + (col.saltWeight || 0), 0);
    const totalOverall =
        totalFlour + totalWater + totalSalt +
        // Preferments may not have salt, so add their totalWeight if not main dough
        stepColumns
            .filter(col => !col.saltWeight)
            .reduce((sum, col) => sum + ((col.totalWeight || 0) - (col.flourWeight || 0) - (col.waterWeight || 0)), 0);

    return (
        <div className={styles.resultsGroup}>
            <h3>Ingredient Breakdown by Step:</h3>

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
            
                <div style={{ overflowX: 'auto', margin: '1em 0' }}>
                    <table className={styles.resultsTable}>
                        <thead>
                            <tr>
                                <th>Ingredient</th>
                                {stepColumns.map(col => (
                                    <th key={col.key}>{col.label}</th>
                                ))}
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Total flour row */}
                            <tr>
                                <td><b>Total flour</b></td>
                                {stepColumns.map((col, i) => (
                                    <td key={col.key + '-flour'}>
                                        {col.flourWeight ? formatWeight(col.flourWeight) : ''}
                                    </td>
                                ))}
                                <td><b>{formatWeight(totalFlour)}</b></td>
                            </tr>
                            {/* Each custom flour */}
                            {uniqueFlourNames.map(flourName => (
                                <tr key={flourName}>
                                    <td style={{ fontSize: 'smaller', paddingLeft: '1em' }}>
                                        • {flourName}
                                    </td>
                                    {stepColumns.map(col => (
                                        <td key={col.key + '-' + flourName} style={{ fontSize: 'smaller' }}>
                                            {getFlourWeight(col, flourName)
                                                ? formatWeight(getFlourWeight(col, flourName))
                                                : ''}
                                        </td>
                                    ))}
                                    <td style={{ fontSize: 'smaller' }}>
                                        {getFlourTotal(flourName)
                                            ? formatWeight(getFlourTotal(flourName))
                                            : ''}
                                    </td>
                                </tr>
                            ))}
                            {/* Water row */}
                            <tr>
                                <td><b>Water</b></td>
                                {stepColumns.map(col => (
                                    <td key={col.key + '-water'}>
                                        {col.waterWeight ? formatWeight(col.waterWeight) : ''}
                                    </td>
                                ))}
                                <td><b>{formatWeight(totalWater)}</b></td>
                            </tr>
                            {/* Salt row */}
                            <tr>
                                <td><b>Salt</b></td>
                                {stepColumns.map(col => (
                                    <td key={col.key + '-salt'}>
                                        {col.saltWeight ? formatWeight(col.saltWeight) : ''}
                                    </td>
                                ))}
                                <td><b>{formatWeight(totalSalt)}</b></td>
                            </tr>
                            {/* Total row */}
                            <tr>
                                <td><b>Total</b></td>
                                {stepColumns.map(col => (
                                    <td key={col.key + '-total'}>
                                        <b>
                                            {col.totalWeight
                                                ? formatWeight(col.totalWeight)
                                                : formatWeight(
                                                      (col.flourWeight || 0) +
                                                      (col.waterWeight || 0) +
                                                      (col.saltWeight || 0)
                                                  )}
                                        </b>
                                    </td>
                                ))}
                                <td><b>{formatWeight(results.grandTotalWeight)}</b></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* You can keep the rest of your summary sections below if desired */}
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