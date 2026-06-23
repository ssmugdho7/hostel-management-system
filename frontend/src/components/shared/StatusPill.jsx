export default function StatusPill({ status }) {
  return <span className={`pill ${status || 'neutral'}`}>{status || 'unknown'}</span>;
}
