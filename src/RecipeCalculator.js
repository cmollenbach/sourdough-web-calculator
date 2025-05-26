import React, { useState, useEffect } from 'react';
import './RecipeCalculator.css'; // We'll create this file for styling soon

// This is the JavaScript version of your Kotlin calculateRecipe function
function calculateRecipe(
    targetDoughWeight,
    hydrationPercentage,
    starterPercentage,
    starterHydration,
    saltPercentage
) {
    // Prevent division by zero and negative weights
    if (targetDoughWeight <= 0 || hydrationPercentage < 0 || starterPercentage < 0 || starterHydration < 0 || saltPercentage < 0) {
        // Allow 0 for percentages for intermediate input states, but guard calculations
        if (targetDoughWeight <= 0) {
            return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0 };
        }
    }

    const targetDoughWeightDouble = parseFloat(targetDoughWeight);
    const hydrationPercentageDouble = parseFloat(hydrationPercentage) / 100.0;
    const starterPercentageDouble = parseFloat(starterPercentage) / 100.0;
    const starterHydrationDouble = parseFloat(starterHydration) / 100.0;
    const saltPercentageDouble = parseFloat(saltPercentage) / 100.0;

    // Guard against NaN issues if percentages are still 0 or invalid during parsing
    if (isNaN(hydrationPercentageDouble) || isNaN(starterPercentageDouble) || isNaN(starterHydrationDouble) || isNaN(saltPercentageDouble)) {
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0 };
    }
    
    // Avoid division by zero if (1 + hydrationPercentageDouble) is zero
    if (1 + hydrationPercentageDouble === 0) {
         return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0 };
    }


    const totalWeightWithoutSalt =
        targetDoughWeightDouble / (1 + saltPercentageDouble * (1 / (1 + hydrationPercentageDouble)));

    const totalFlourWeight = totalWeightWithoutSalt / (1 + hydrationPercentageDouble);

    // Avoid division by zero if (1 + starterHydrationDouble) is zero
     if (1 + starterHydrationDouble === 0) {
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0 };
    }

    const flourFromStarter =
        (totalFlourWeight * starterPercentageDouble) / (1 + starterHydrationDouble);
    const waterFromStarter = flourFromStarter * starterHydrationDouble;

    const finalFlourWeight = totalFlourWeight - flourFromStarter;
    const totalWaterWeight = totalWeightWithoutSalt - totalFlourWeight;
    const finalWaterWeight = totalWaterWeight - waterFromStarter;

    const finalStarterWeight = flourFromStarter + waterFromStarter;
    const saltWeight = totalFlourWeight * saltPercentageDouble;

    // Round to the nearest whole number
    const round = (num) => {
        if (isNaN(num) || !isFinite(num)) return 0; // Handle potential NaN or Infinity
        return Math.round(num); // Changed to round to the nearest whole number
    }


    return {
        flourWeight: round(finalFlourWeight),
        waterWeight: round(finalWaterWeight),
        starterWeight: round(finalStarterWeight),
        saltWeight: round(saltWeight)
    };
}


function RecipeCalculator() {
    // State for inputs with your desired defaults
    const [targetDoughWeight, setTargetDoughWeight] = useState('1500'); // Default: 1500
    const [hydrationPercentage, setHydrationPercentage] = useState('65'); // Default: 65
    const [starterPercentage, setStarterPercentage] = useState('15');   // Default: 15
    const [starterHydration, setStarterHydration] = useState('100');  // Default: 100
    const [saltPercentage, setSaltPercentage] = useState('2');       // Default: 2

    // State for results
    const [results, setResults] = useState({
        flourWeight: 0,
        waterWeight: 0,
        starterWeight: 0,
        saltWeight: 0
    });

    // Effect to recalculate when inputs change
    useEffect(() => {
        // Ensure values are treated as numbers for calculation; use 0 if input is empty or invalid
        const weight = parseFloat(targetDoughWeight) || 0;
        const hydration = parseFloat(hydrationPercentage) || 0;
        const starter = parseFloat(starterPercentage) || 0;
        const starterHyd = parseFloat(starterHydration) || 0;
        const salt = parseFloat(saltPercentage) || 0;

        const newResults = calculateRecipe(
            weight,
            hydration,
            starter,
            starterHyd,
            salt
        );
        setResults(newResults);
    }, [targetDoughWeight, hydrationPercentage, starterPercentage, starterHydration, saltPercentage]);

    const totalCalculatedWeight = results.flourWeight + results.waterWeight + results.starterWeight + results.saltWeight;

    return (
        <div className="recipe-calculator">
            <h2>Sourdough Recipe Calculator</h2>

            <div className="input-group two-column">
                <label htmlFor="targetDoughWeight">Target Dough Weight (g):</label>
                <input
                    type="number"
                    id="targetDoughWeight"
                    value={targetDoughWeight}
                    onChange={(e) => setTargetDoughWeight(e.target.value)}
                    placeholder="e.g., 900"
                />
            </div>

            <div className="input-group two-column">
                <label htmlFor="hydrationPercentage">Hydration (%):</label>
                <input
                    type="number"
                    id="hydrationPercentage"
                    value={hydrationPercentage}
                    onChange={(e) => setHydrationPercentage(e.target.value)}
                    placeholder="e.g., 75"
                />
            </div>

            <div className="input-group two-column">
                <label htmlFor="starterPercentage">Starter (% of flour):</label>
                <input
                    type="number"
                    id="starterPercentage"
                    value={starterPercentage}
                    onChange={(e) => setStarterPercentage(e.target.value)}
                    placeholder="e.g., 20"
                />
            </div>

            <div className="input-group two-column">
                <label htmlFor="starterHydration">Starter Hydration (%):</label>
                <input
                    type="number"
                    id="starterHydration"
                    value={starterHydration}
                    onChange={(e) => setStarterHydration(e.target.value)}
                    placeholder="e.g., 100"
                />
            </div>

            <div className="input-group two-column">
                <label htmlFor="saltPercentage">Salt (% of flour):</label>
                <input
                    type="number"
                    id="saltPercentage"
                    value={saltPercentage}
                    onChange={(e) => setSaltPercentage(e.target.value)}
                    placeholder="e.g., 2"
                />
            </div>

            <div className="results-group">
                <h3>Recipe:</h3>
                <div className="result-item"><span>Flour:</span> <span>{results.flourWeight} g</span></div>
                <div className="result-item"><span>Water:</span> <span>{results.waterWeight} g</span></div>
                <div className="result-item"><span>Starter:</span> <span>{results.starterWeight} g</span></div>
                <div className="result-item"><span>Salt:</span> <span>{results.saltWeight} g</span></div>
                <div className="result-item total">
                    <strong>Total:</strong>
                    <strong>{isNaN(totalCalculatedWeight) ? 0 : totalCalculatedWeight} g</strong>
                </div>
            </div>
        </div>
    );
}

export default RecipeCalculator;