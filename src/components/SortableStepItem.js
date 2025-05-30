// src/components/SortableStepItem.js
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './RecipeCalculator.module.css';

export function SortableStepItem(props) {
  const {
    attributes,
    listeners, // We will pass these down
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    // No direct listeners here anymore
  };

  const itemClassName = isDragging ? styles.sortableStepDragActive : '';

  // Clone the child (StepEditor) and pass down drag-related props
  // The child will be responsible for applying listeners to a specific handle
  return (
    <div ref={setNodeRef} style={style} className={itemClassName} {...attributes}>
      {React.Children.map(props.children, child => {
        if (React.isValidElement(child)) {
          // Pass listeners and other necessary DnD props to StepEditor
          // StepEditor will need to accept and use 'dndListeners' for its drag handle
          return React.cloneElement(child, { dndListeners: listeners });
        }
        return child;
      })}
    </div>
  );
}