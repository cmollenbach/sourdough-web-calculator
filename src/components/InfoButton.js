// src/components/InfoButton.js (or similar component)
import React from 'react';
import styles from './RecipeCalculator.module.css';
import { getInfoButtonContent } from '../utils/infoContent';

function InfoButton({ termKey, termDisplayName, onClick }) {
    const handleInfoClick = () => {
        const content = getInfoButtonContent(termKey, termDisplayName);
        const safeTitle = termDisplayName || (termKey || '').replace(/_/g, ' ');
        onClick(safeTitle, content);
    };

    const safeTitle = termDisplayName || (termKey || '').replace(/_/g, ' ');

    return (
        <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
                e.stopPropagation();
                handleInfoClick();
            }}
            title={`Get explanation for ${safeTitle}`}
            className={`btn btn-icon btn-small ${styles.infoButton}`}
            aria-label={`Get explanation for ${safeTitle}`}
        >
            ⓘ
        </button>
    );
}

export default InfoButton;