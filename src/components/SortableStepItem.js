// src/components/SortableStepItem.js
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// You might want a specific CSS module for this if it needs unique styling beyond drag state.
// import styles from './SortableStepItem.module.css'; 

export function SortableStepItem(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1, // Make it slightly more transparent when dragging
    // marginBottom: 'calc(var(--spacing-unit) * 2)', // if styles.stepItemEditor margin is removed
    // Add other drag-specific styles if needed
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {props.children}
    </div>
  );
}