// src/components/RecipeResults.js
import React from 'react';
import styles from './RecipeCalculator.module.css';

/**
 * @param {object} props
 * @param {object} props.results
 * @param {number} props.results.flourWeight
 * @param {number} props.results.waterWeight
 * @param {number} props.results.starterWeight
 * @param {number} props.results.saltWeight
 * @param {number} props.results.totalWeight
 */
function RecipeResults({ results }) {
    return (
        <div className={styles.resultsGroup}>
            <h3>Recipe Calculation:</h3>
            <div className={styles.resultItem}><span>Flour (added):</span> <span>{results.flourWeight} g</span></div>
            <div className={styles.resultItem}><span>Water (added):</span> <span>{results.waterWeight} g</span></div>
            <div className={styles.resultItem}><span>Starter:</span> <span>{results.starterWeight} g</span></div>
            <div className={styles.resultItem}><span>Salt:</span> <span>{results.saltWeight} g</span></div>
            <div className={`${styles.resultItem} ${styles.total}`}>
                <strong>Total:</strong>
                <strong>{results.totalWeight} g</strong>
            </div>
        </div>
    );
}

export default RecipeResults;