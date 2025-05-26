// src/RecipeCalculator.js
import React, { useState, useEffect, useCallback } from 'react';
import './RecipeCalculator.css';

const USER_ID_KEY = 'sourdoughAppUserId';

// This will be your Render backend URL when deployed, or localhost for local development
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

const getUserId = () => {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
};

const currentUserId = getUserId();

// ... (calculateRecipe function remains the same) ...
function calculateRecipe(
    targetDoughWeight,
    hydrationPercentage,
    starterPercentage,
    starterHydration,
    saltPercentage
) {
    // Prevent division by zero and negative weights
    if (targetDoughWeight <= 0 || hydrationPercentage < 0 || starterPercentage < 0 || starterHydration < 0 || saltPercentage < 0) {
        if (targetDoughWeight <= 0) {
            return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0 };
        }
    }

    const targetDoughWeightDouble = parseFloat(targetDoughWeight);
    const hydrationPercentageDouble = parseFloat(hydrationPercentage) / 100.0;
    const starterPercentageDouble = parseFloat(starterPercentage) / 100.0;
    const starterHydrationDouble = parseFloat(starterHydration) / 100.0;
    const saltPercentageDouble = parseFloat(saltPercentage) / 100.0;

    if (isNaN(hydrationPercentageDouble) || isNaN(starterPercentageDouble) || isNaN(starterHydrationDouble) || isNaN(saltPercentageDouble)) {
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0 };
    }

    if (1 + hydrationPercentageDouble === 0) {
        return { flourWeight: 0, waterWeight: 0, starterWeight: 0, saltWeight: 0 };
    }

    const totalWeightWithoutSalt =
        targetDoughWeightDouble / (1 + saltPercentageDouble * (1 / (1 + hydrationPercentageDouble)));

    const totalFlourWeight = totalWeightWithoutSalt / (1 + hydrationPercentageDouble);

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

    const round = (num) => {
        if (isNaN(num) || !isFinite(num)) return 0;
        return Math.round(num * 10) / 10;
    }

    return {
        flourWeight: round(finalFlourWeight),
        waterWeight: round(finalWaterWeight),
        starterWeight: round(finalStarterWeight),
        saltWeight: round(saltWeight)
    };
}

function RecipeCalculator() {
    const initialInputs = {
        targetDoughWeight: '1500',
        hydrationPercentage: '65',
        starterPercentage: '15',
        starterHydration: '100',
        saltPercentage: '2',
    };

    const [targetDoughWeight, setTargetDoughWeight] = useState(initialInputs.targetDoughWeight);
    const [hydrationPercentage, setHydrationPercentage] = useState(initialInputs.hydrationPercentage);
    const [starterPercentage, setStarterPercentage] = useState(initialInputs.starterPercentage);
    const [starterHydration, setStarterHydration] = useState(initialInputs.starterHydration);
    const [saltPercentage, setSaltPercentage] = useState(initialInputs.saltPercentage);

    const [results, setResults] = useState({
        flourWeight: 0,
        waterWeight: 0,
        starterWeight: 0,
        saltWeight: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    const setAllInputs = useCallback((data) => {
        setTargetDoughWeight(String(data.targetDoughWeight || initialInputs.targetDoughWeight));
        setHydrationPercentage(String(data.hydrationPercentage || initialInputs.hydrationPercentage));
        setStarterPercentage(String(data.starterPercentage || initialInputs.starterPercentage));
        setStarterHydration(String(data.starterHydration || initialInputs.starterHydration));
        setSaltPercentage(String(data.saltPercentage || initialInputs.saltPercentage));
    }, []); // initialInputs is stable, so no need to add it as a dependency

    useEffect(() => {
        setIsLoading(true);
        console.log(`Workspaceing from: <span class="math-inline">\{API\_BASE\_URL\}/api/recipe/</span>{currentUserId}`); // Log the URL
        fetch(`<span class="math-inline">\{API\_BASE\_URL\}/api/recipe/</span>{currentUserId}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                console.log("Fetched data:", data);
                setAllInputs(data);
            })
            .catch(error => {
                console.error("Error fetching recipe data:", error);
                setAllInputs(initialInputs); // Fallback to initial defaults
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [setAllInputs]);

    useEffect(() => {
        if (isLoading) return;

        const inputsToSave = {
            targetDoughWeight,
            hydrationPercentage,
            starterPercentage,
            starterHydration,
            saltPercentage,
        };
        console.log(`Posting to: <span class="math-inline">\{API\_BASE\_URL\}/api/recipe/</span>{currentUserId}`); // Log the URL
        fetch(`<span class="math-inline">\{API\_BASE\_URL\}/api/recipe/</span>{currentUserId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(inputsToSave),
        })
        .then(res => {
            if (!res.ok) {
                // If response is not OK, try to parse error message from backend if it's JSON
                return res.json().then(errData => {
                    throw new Error(`HTTP error! status: ${res.status}, message: ${errData.message || 'Unknown error'}`);
                }).catch(() => {
                    // If error response is not JSON, throw generic error
                    throw new Error(`HTTP error! status: ${res.status}`);
                });
            }
            return res.json();
        })
        .then(data => console.log("Save response:", data.message))
        .catch(error => console.error("Error saving recipe data:", error));

    }, [targetDoughWeight, hydrationPercentage, starterPercentage, starterHydration, saltPercentage, isLoading]);

    useEffect(() => {
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

    if (isLoading) {
        return <div className="recipe-calculator"><p>Loading recipe...</p></div>;
    }

    return (
        // ... JSX for inputs and results remains the same ...
        // (Make sure this part is identical to your last working version of the JSX)
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
                    <strong>{isNaN(totalCalculatedWeight) ? 0 : totalCalculatedWeight.toFixed(1)} g</strong>
                </div>
            </div>
        </div>
    );
}

export default RecipeCalculator;