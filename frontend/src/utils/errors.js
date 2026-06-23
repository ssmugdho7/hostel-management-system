export function fieldsFromErrors(errors) {
  return Object.values(errors || {}).flat().join(' ');
}
