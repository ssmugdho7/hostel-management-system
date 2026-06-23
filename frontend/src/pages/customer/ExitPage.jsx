import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageTitle from '../../components/shared/PageTitle';
import SectionHeader from '../../components/shared/SectionHeader';
import EmptyState from '../../components/shared/EmptyState';
import StatusPill from '../../components/shared/StatusPill';
import RequestsTable from '../../components/shared/RequestsTable';
import LoadingBlock from '../../components/shared/LoadingBlock';
import { useToast } from '../../hooks/useToast';
import { fieldsFromErrors } from '../../utils/errors';
import { formatMoney, formatDate, today } from '../../utils/format';

export default function ExitPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ requested_exit_date: today(), reason: '' });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await apiClient.get('/exit-requests');
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

  async function runPreview() {
    try {
      const { data } = await apiClient.post('/exit-requests/preview', {
        requested_exit_date: form.requested_exit_date,
      });
      setPreview(data);
    } catch (err) {
      notify(fieldsFromErrors(err.errors) || err.message, 'error');
    }
  }

  async function submit(event) {
    event.preventDefault();
    try {
      const { data } = await apiClient.post('/exit-requests', form);
      notify(data.message);
      setForm({ requested_exit_date: today(), reason: '' });
      setPreview(null);
      await load();
    } catch (err) {
      notify(fieldsFromErrors(err.errors) || err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageTitle title="Exit Request" subtitle="Check notice period and settlement before submission." />
      <section className="two-column align-start">
        <form className="panel form-grid" onSubmit={submit}>
          <SectionHeader title="New exit request" />
          <label>
            Exit date
            <input
              type="date"
              min={today()}
              value={form.requested_exit_date}
              onChange={(e) => setForm((current) => ({ ...current, requested_exit_date: e.target.value }))}
              required
            />
          </label>
          <label>
            Reason
            <textarea
              value={form.reason}
              onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))}
              rows="4"
            />
          </label>
          <div className="button-row">
            <button type="button" className="secondary-action" onClick={runPreview}>
              Preview
            </button>
            <button className="primary-action" type="submit">
              Submit exit
            </button>
          </div>
        </form>

        <div className="panel">
          <SectionHeader title="Settlement preview" />
          {preview ? (
            <div className="detail-grid">
              <span>Notice period</span>
              <strong>{preview.notice_period_days} days</strong>
              <span>Days until exit</span>
              <strong>{preview.days_until_exit}</strong>
              <span>Notice valid</span>
              <strong>{preview.notice_valid ? 'Yes' : 'No'}</strong>
              <span>Rent payable</span>
              <strong>{formatMoney(preview.rent_payable)}</strong>
              <span>Deposit refund</span>
              <strong>{formatMoney(preview.deposit_refundable)}</strong>
              <span>Net payable</span>
              <strong>{formatMoney(preview.net_payable)}</strong>
              <p className="full-row">{preview.note}</p>
            </div>
          ) : (
            <EmptyState title="Preview not generated" detail="Choose an exit date and preview." />
          )}
        </div>
      </section>

      <RequestsTable
        title="Exit history"
        rows={rows}
        columns={[
          ['Date', (row) => formatDate(row.requested_exit_date)],
          ['Net payable', (row) => formatMoney(row.net_payable)],
          ['Status', (row) => <StatusPill status={row.status} />],
          ['Reason', (row) => row.reason || 'N/A'],
        ]}
      />
    </>
  );
}
