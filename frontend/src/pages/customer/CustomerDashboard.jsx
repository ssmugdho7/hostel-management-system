import PageTitle from '../../components/shared/PageTitle';
import StatCard from '../../components/shared/StatCard';
import SectionHeader from '../../components/shared/SectionHeader';
import FeedPanel from '../../components/shared/FeedPanel';
import EmptyState from '../../components/shared/EmptyState';
import LoadingBlock from '../../components/shared/LoadingBlock';
import StatusPill from '../../components/shared/StatusPill';
import { useApi } from '../../hooks/useApi';
import { formatMoney, formatDate, seatLabel } from '../../utils/format';

export default function CustomerDashboard() {
  const { data, loading } = useApi('/dashboard');

  if (loading) return <LoadingBlock />;
  if (!data) return <EmptyState title="Dashboard unavailable" detail="Refresh the page after the API is running." />;

  return (
    <>
      <PageTitle title="Dashboard" subtitle={seatLabel(data.current_seat)} />
      <section className="stat-grid">
        <StatCard
          label="Current balance"
          value={formatMoney(data.balance)}
          tone={Number(data.balance) < 0 ? 'danger' : ''}
        />
        <StatCard label="Consumed rent" value={formatMoney(data.consumed_rent)} />
        <StatCard label="Covered days" value={data.remaining_days_coverage} />
        <StatCard label="Unread notices" value={data.summary?.unread_notifications || 0} />
      </section>

      <section className="two-column">
        <div className="panel">
          <SectionHeader title="Due bills" />
          {data.due_bills?.length ? (
            <div className="item-list">
              {data.due_bills.map((bill) => (
                <article className="list-item" key={bill.id}>
                  <div>
                    <strong>{bill.period_month}</strong>
                    <span>Due {formatDate(bill.due_date)}</span>
                  </div>
                  <div className="right">
                    <StatusPill status={bill.status} />
                    <strong>{formatMoney(Number(bill.amount_due) - Number(bill.amount_paid))}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No due bills" detail="Rent billing is clear for now." />
          )}
        </div>

        <div className="panel">
          <SectionHeader title="Pending requests" />
          <section className="mini-stats">
            <StatCard label="Seat changes" value={data.summary?.pending_seat_changes || 0} />
            <StatCard label="Leaves" value={data.summary?.pending_leaves || 0} />
            <StatCard label="Exits" value={data.summary?.pending_exits || 0} />
          </section>
        </div>
      </section>

      <section className="two-column">
        <FeedPanel title="Recent notifications" items={data.recent_notifications} />
        <FeedPanel title="Announcements" items={data.announcements} />
      </section>
    </>
  );
}
