import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageTitle from '../../components/shared/PageTitle';
import SectionHeader from '../../components/shared/SectionHeader';
import StatusPill from '../../components/shared/StatusPill';
import RequestsTable from '../../components/shared/RequestsTable';
import LoadingBlock from '../../components/shared/LoadingBlock';
import { useToast } from '../../hooks/useToast';
import { fieldsFromErrors } from '../../utils/errors';
import { formatDate, today } from '../../utils/format';

export default function LeavePage() {
  const { notify } = useToast();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ start_date: today(), end_date: today(), reason: '' });
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await apiClient.get('/leave-applications');
      setRows(data);
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

  async function submit(event) {
    event.preventDefault();
    try {
      const { data } = await apiClient.post('/leave-applications', form);
      notify(data.message);
      setForm({ start_date: today(), end_date: today(), reason: '' });
      await load();
    } catch (err) {
      notify(fieldsFromErrors(err.errors) || err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageTitle title="Leave Applications" subtitle="Submit and track leave approval." />
      <section className="two-column align-start">
        <form className="panel form-grid" onSubmit={submit}>
          <SectionHeader title="New leave" />
          <label>
            Start date
            <input
              type="date"
              min={today()}
              value={form.start_date}
              onChange={(e) => setForm((current) => ({ ...current, start_date: e.target.value }))}
              required
            />
          </label>
          <label>
            End date
            <input
              type="date"
              min={form.start_date}
              value={form.end_date}
              onChange={(e) => setForm((current) => ({ ...current, end_date: e.target.value }))}
              required
            />
          </label>
          <label>
            Reason
            <textarea
              value={form.reason}
              onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))}
              rows="4"
              required
            />
          </label>
          <button className="primary-action" type="submit">
            Submit leave
          </button>
        </form>

        <RequestsTable
          title="History"
          rows={rows}
          columns={[
            ['Dates', (row) => `${formatDate(row.start_date)} to ${formatDate(row.end_date)}`],
            ['Status', (row) => <StatusPill status={row.status} />],
            ['Reason', (row) => row.reason],
          ]}
        />
      </section>
    </>
  );
}
