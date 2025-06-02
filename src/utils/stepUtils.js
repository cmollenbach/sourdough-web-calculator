export function isFermentationStep(step) {
  if (!step) return false;
  // Check step_type and step_name for fermentation-related keywords
  const type = step.step_type ? step.step_type.toLowerCase() : '';
  const name = step.step_name ? step.step_name.toLowerCase() : '';
  return (
    type.includes('ferment') ||
    type.includes('bulk') ||
    type.includes('proof') ||
    name.includes('ferment') ||
    name.includes('bulk') ||
    name.includes('proof')
  );
}