import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageTitle from '../../components/shared/PageTitle';
import StatusPill from '../../components/shared/StatusPill';
import ActionButtons from '../../components/shared/ActionButtons';
import RequestsTable from '../../components/shared/RequestsTable';
import LoadingBlock from '../../components/shared/LoadingBlock';
import { useToast } from '../../hooks/useToast';
import { formatMoney, formatDate, seatLabel } from '../../utils/format';

export default function AdminRequests() {
  const { notify } = useToast();
  const [active, setActive] = useState('seat');
  const [seatRows, setSeatRows] = useState([]);
  const [leaveRows, setLeaveRows] = useState([]);
  const [exitRows, setExitRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [seat, leave, exit] = await Promise.all([
        apiClient.get('/admin/seat-change-requests'),
        apiClient.get('/admin/leave-applications'),
        apiClient.get('/admin/exit-requests'),
      ]);
      setSeatRows(seat.data);
      setLeaveRows(leave.data);
      setExitRows(exit.data);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function action(type, id, decision) {
    const reason = decision === 'reject' ? window.prompt('Rejection reason', 'Not eligible.') : '';
    if (decision === 'reject' && reason === null) return;

    try {
      const { data } = await apiClient.put(`/admin/${type}/${id}/${decision}`, reason ? { reason } : {});
      notify(data.message);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageTitle title="Request Queues" subtitle="Approve or reject pending resident requests." />
      <div className="segmented page-tabs">
        <button className={active === 'seat' ? 'active' : ''} type="button" onClick={() => setActive('seat')}>
          Seat changes
        </button>
        <button className={active === 'leave' ? 'active' : ''} type="button" onClick={() => setActive('leave')}>
          Leaves
        </button>
        <button className={active === 'exit' ? 'active' : ''} type="button" onClick={() => setActive('exit')}>
          Exits
        </button>
      </div>

      {active === 'seat' && (
        <RequestsTable
          title="Seat change requests"
          rows={seatRows}
          columns={[
            ['Resident', (row) => row.user?.name],
            ['From', (row) => seatLabel(row.from_seat)],
            ['To', (row) => seatLabel(row.to_seat)],
            ['Payable', (row) => formatMoney(row.payable_amount)],
            ['Status', (row) => <StatusPill status={row.status} />],
            [
              'Actions',
              (row) =>
                row.status === 'pending' ? (
                  <ActionButtons
                    onApprove={() => action('seat-change-requests', row.id, 'approve')}
                    onReject={() => action('seat-change-requests', row.id, 'reject')}
                  />
                ) : (
                  'Closed'
                ),
            ],
          ]}
        />
      )}

      {active === 'leave' && (
        <RequestsTable
          title="Leave applications"
          rows={leaveRows}
          columns={[
            ['Resident', (row) => row.user?.name],
            ['Dates', (row) => `${formatDate(row.start_date)} to ${formatDate(row.end_date)}`],
            ['Reason', (row) => row.reason],
            ['Status', (row) => <StatusPill status={row.status} />],
            [
              'Actions',
              (row) =>
                row.status === 'pending' ? (
                  <ActionButtons
                    onApprove={() => action('leave-applications', row.id, 'approve')}
                    onReject={() => action('leave-applications', row.id, 'reject')}
                  />
                ) : (
                  'Closed'
                ),
            ],
          ]}
        />
      )}

      {active === 'exit' && (
        <RequestsTable
          title="Exit requests"
          rows={exitRows}
          columns={[
            ['Resident', (row) => row.user?.name],
            ['Exit date', (row) => formatDate(row.requested_exit_date)],
            ['Net payable', (row) => formatMoney(row.net_payable)],
            ['Status', (row) => <StatusPill status={row.status} />],
            [
              'Actions',
              (row) =>
                row.status === 'pending' ? (
                  <ActionButtons
                    onApprove={() => action('exit-requests', row.id, 'approve')}
                    onReject={() => action('exit-requests', row.id, 'reject')}
                  />
                ) : (
                  'Closed'
                ),
            ],
          ]}
        />
      )}
    </>
  );
}
