// sourdough-web-calculator/src/RecipeCalculator.js
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import './RecipeCalculator.css';

const USER_ID_KEY = 'sourdoughAppUserId';
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

// Moved initialInputs outside the component so it's a stable reference
const INITIAL_INPUTS = {
    targetDoughWeight: '1500',
    hydrationPercentage: '65',
    starterPercentage: '15',
    starterHydration: '100',
    saltPercentage: '2',
};

function calculateRecipe(
    targetDoughWeight,
    hydrationPercentage,
    starterPercentage,
    starterHydration,
    saltPercentage
) {
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

    let totalFlourWeight = totalWeightWithoutSalt / (1 + hydrationPercentageDouble);
    if (isNaN(totalFlourWeight) || !isFinite(totalFlourWeight)) totalFlourWeight = 0;


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
    // Use the stable INITIAL_INPUTS for useState initialization
    const [targetDoughWeight, setTargetDoughWeight] = useState(INITIAL_INPUTS.targetDoughWeight);
    const [hydrationPercentage, setHydrationPercentage] = useState(INITIAL_INPUTS.hydrationPercentage);
    const [starterPercentage, setStarterPercentage] = useState(INITIAL_INPUTS.starterPercentage);
    const [starterHydration, setStarterHydration] = useState(INITIAL_INPUTS.starterHydration);
    const [saltPercentage, setSaltPercentage] = useState(INITIAL_INPUTS.saltPercentage);

    const [results, setResults] = useState({
        flourWeight: 0,
        waterWeight: 0,
        starterWeight: 0,
        saltWeight: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    // setAllInputs now correctly uses INITIAL_INPUTS from outside, so it doesn't need it in its own deps for this reason.
    // However, to satisfy ESLint about stable function references when it's passed to useEffect,
    // and because INITIAL_INPUTS is now truly constant from the module scope,
    // the dependency array for useCallback can be empty if INITIAL_INPUTS is guaranteed not to change.
    // Or, more simply, if initialInputs was a prop or state, then the useMemo approach suggested by ESLint for initialInputs
    // would be for defining initialInputs inside RecipeCalculator.
    // Since we moved INITIAL_INPUTS outside, its reference is stable.
    const setAllInputs = useCallback((data) => {
        setTargetDoughWeight(String(data.targetDoughWeight || INITIAL_INPUTS.targetDoughWeight));
        setHydrationPercentage(String(data.hydrationPercentage || INITIAL_INPUTS.hydrationPercentage));
        setStarterPercentage(String(data.starterPercentage || INITIAL_INPUTS.starterPercentage));
        setStarterHydration(String(data.starterHydration || INITIAL_INPUTS.starterHydration));
        setSaltPercentage(String(data.saltPercentage || INITIAL_INPUTS.saltPercentage));
    }, []); // Empty dependency array because INITIAL_INPUTS is now a module-level constant

    useEffect(() => {
        setIsLoading(true);
        console.log(`Workspaceing from: ${API_BASE_URL}/api/recipe/${currentUserId}`);
        fetch(`${API_BASE_URL}/api/recipe/${currentUserId}`)
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
                setAllInputs(INITIAL_INPUTS); // Use the stable constant
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [setAllInputs]); // Removed API_BASE_URL, currentUserId, INITIAL_INPUTS as they are stable module/component constants

    useEffect(() => {
        if (isLoading) return;

        const inputsToSave = {
            targetDoughWeight,
            hydrationPercentage,
            starterPercentage,
            starterHydration,
            saltPercentage,
        };
        console.log(`Posting to: ${API_BASE_URL}/api/recipe/${currentUserId}`);
        fetch(`${API_BASE_URL}/api/recipe/${currentUserId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(inputsToSave),
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(errData => {
                    throw new Error(`HTTP error! status: ${res.status}, message: ${errData.message || 'Unknown error'}`);
                }).catch(() => {
                    throw new Error(`HTTP error! status: ${res.status}`);
                });
            }
            return res.json();
        })
        .then(data => console.log("Save response:", data.message))
        .catch(error => console.error("Error saving recipe data:", error));

    }, [targetDoughWeight, hydrationPercentage, starterPercentage, starterHydration, saltPercentage, isLoading]); // Removed API_BASE_URL, currentUserId

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
        // JSX structure remains the same
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