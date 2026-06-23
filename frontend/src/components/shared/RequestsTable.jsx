import SectionHeader from './SectionHeader';
import EmptyState from './EmptyState';

export default function RequestsTable({ title, rows = [], columns }) {
  return (
    <section className="panel table-panel">
      <SectionHeader title={title} />
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map(([header]) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map(([header, render]) => (
                    <td key={header}>{render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No records" detail="Matching records will appear here." />
      )}
    </section>
  );
}
