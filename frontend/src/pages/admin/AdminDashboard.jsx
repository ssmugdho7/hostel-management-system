import PageTitle from '../../components/shared/PageTitle';
import StatCard from '../../components/shared/StatCard';
import SectionHeader from '../../components/shared/SectionHeader';
import EmptyState from '../../components/shared/EmptyState';
import LoadingBlock from '../../components/shared/LoadingBlock';
import { useApi } from '../../hooks/useApi';
import { formatDate, seatLabel } from '../../utils/format';

function AdminQueue({ title, rows = [], render }) {
  return (
    <div className="panel">
      <SectionHeader title={title} />
      {rows.length ? (
        <div className="item-list compact-list">
          {rows.map((row) => (
            <article className="list-item stacked" key={row.id}>
              <strong>{render(row)}</strong>
              <small>Submitted {formatDate(row.created_at)}</small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Queue clear" detail="No pending items." />
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { data, loading } = useApi('/admin/dashboard');
  if (loading) return <LoadingBlock />;

  const stats = data?.stats || {};

  return (
    <>
      <PageTitle title="Admin Overview" subtitle="Live operational summary." />
      <section className="stat-grid admin">
        <StatCard label="Customers" value={stats.total_customers || 0} />
        <StatCard label="Active customers" value={stats.active_customers || 0} />
        <StatCard label="Available seats" value={stats.available_seats || 0} />
        <StatCard label="Occupied seats" value={stats.occupied_seats || 0} />
        <StatCard label="Seat changes" value={stats.pending_seat_changes || 0} />
        <StatCard label="Leaves" value={stats.pending_leaves || 0} />
        <StatCard label="Exits" value={stats.pending_exits || 0} />
      </section>

      <section className="three-column">
        <AdminQueue
          title="Seat changes"
          rows={data?.pending_seat_changes}
          render={(row) => `${row.user?.name} to ${seatLabel(row.to_seat)}`}
        />
        <AdminQueue
          title="Leaves"
          rows={data?.pending_leaves}
          render={(row) => `${row.user?.name} - ${formatDate(row.start_date)}`}
        />
        <AdminQueue
          title="Exits"
          rows={data?.pending_exits}
          render={(row) => `${row.user?.name} - ${formatDate(row.requested_exit_date)}`}
        />
      </section>
    </>
  );
}
