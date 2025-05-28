// src/components/SortableStepItem.js
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './RecipeCalculator.module.css'; // Import the module for active drag style

export function SortableStepItem(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging, // Provided by useSortable
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    // Add other drag-specific styles if needed, or use a class
  };

  // Apply an additional class when dragging for more distinct styling
  const itemClassName = isDragging ? styles.sortableStepDragActive : '';

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={itemClassName}>
      {props.children}
    </div>
  );
}