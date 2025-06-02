import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './RecipeCalculator.module.css';

export function SortableStepItem(props) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
    listeners,
    attributes,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  const itemClassName = [
    isDragging ? styles.sortableStepDragActive : '',
    props.children?.props?.step?.timingRelationType === 'with_previous_start' ? styles.stepItemConcurrent : '',
    props.children?.props?.step?.timingRelationType === 'manual_independent' ? styles.stepItemIndependent : ''
  ].join(' ');

  // Visual icon for timing relation
  let timingIcon = null;
  if (props.children?.props?.step?.timingRelationType === 'with_previous_start') {
    timingIcon = <span className={styles.concurrentIcon} title="Overlaps previous">║</span>;
  } else if (props.children?.props?.step?.timingRelationType === 'manual_independent') {
    timingIcon = <span className={styles.independentIcon} title="Independent">📌</span>;
  }

  // Clone the child and inject dndListeners and dndAttributes
  const childWithDnD = React.cloneElement(props.children, {
    dndListeners: listeners,
    dndAttributes: attributes,
  });

  return (
    <div ref={setNodeRef} style={style} className={itemClassName}>
      {childWithDnD}
      {timingIcon}
    </div>
  );
}