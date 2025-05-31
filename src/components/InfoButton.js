import React from 'react';
import styles from './RecipeCalculator.module.css';

function InfoButton({ termKey, termDisplayName, onClick }) {
    return (
        <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
                e.stopPropagation();
                onClick(termKey, termDisplayName);
            }}
            title={`Get AI explanation for ${termDisplayName || termKey.replace(/_/g, ' ')}`}
            className={`btn btn-icon btn-small ${styles.infoButton}`}
            aria-label={`Get explanation for ${termDisplayName || termKey.replace(/_/g, ' ')}`}
        >
            ⓘ
        </button>
    );
}

export default InfoButton;