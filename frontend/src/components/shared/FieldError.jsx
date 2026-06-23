export default function FieldError({ errors, name }) {
  if (!errors?.[name]) return null;
  return <span className="field-error">{errors[name][0]}</span>;
}
