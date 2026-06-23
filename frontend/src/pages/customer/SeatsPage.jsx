import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageTitle from '../../components/shared/PageTitle';
import SectionHeader from '../../components/shared/SectionHeader';
import EmptyState from '../../components/shared/EmptyState';
import LoadingBlock from '../../components/shared/LoadingBlock';
import StatusPill from '../../components/shared/StatusPill';
import RequestsTable from '../../components/shared/RequestsTable';
import { useToast } from '../../hooks/useToast';
import { fieldsFromErrors } from '../../utils/errors';
import { formatMoney, formatDate, today, seatLabel } from '../../utils/format';

export default function SeatsPage() {
  const { notify } = useToast();
  const [seats, setSeats] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState('');
  const [requestedDate, setRequestedDate] = useState(today());
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const [seatRes, reqRes] = await Promise.all([
        apiClient.get('/seats?available_only=1'),
        apiClient.get('/seat-change-requests'),
      ]);
      setSeats(seatRes.data);
      setRequests(reqRes.data);
      setSelectedSeat((current) => current || seatRes.data[0]?.id?.toString() || '');
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
    if (!selectedSeat) return;
    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/seat-change-requests/preview', { to_seat_id: selectedSeat });
      setPreview(data);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRequest(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/seat-change-requests', {
        to_seat_id: selectedSeat,
        requested_date: requestedDate,
        note,
      });
      notify(data.message);
      setNote('');
      setPreview(null);
      await load();
    } catch (err) {
      notify(fieldsFromErrors(err.errors) || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageTitle title="Seat Change" subtitle="Preview billing before submitting a seat change request." />
      <section className="two-column align-start">
        <form className="panel form-grid" onSubmit={submitRequest}>
          <SectionHeader title="New request" />
          <label>
            Target seat
            <select
              value={selectedSeat}
              onChange={(e) => setSelectedSeat(e.target.value)}
              required
            >
              {seats.map((seat) => (
                <option value={seat.id} key={seat.id}>
                  {seatLabel(seat)} - {formatMoney(seat.price_per_day)}/day
                </option>
              ))}
            </select>
          </label>
          <label>
            Requested date
            <input
              type="date"
              min={today()}
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
            />
          </label>
          <label>
            Note
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows="4" />
          </label>
          <div className="button-row">
            <button
              type="button"
              className="secondary-action"
              disabled={submitting || !selectedSeat}
              onClick={runPreview}
            >
              Preview
            </button>
            <button className="primary-action" disabled={submitting || !selectedSeat} type="submit">
              Submit request
            </button>
          </div>
        </form>

        <div className="panel">
          <SectionHeader title="Billing preview" />
          {preview ? (
            <div className="detail-grid">
              <span>From</span>
              <strong>{seatLabel(preview.from_seat)}</strong>
              <span>To</span>
              <strong>{seatLabel(preview.to_seat)}</strong>
              <span>Request type</span>
              <strong>{preview.type?.replace('_', ' ')}</strong>
              <span>Remaining days</span>
              <strong>{preview.remaining_days}</strong>
              <span>Payable</span>
              <strong>{formatMoney(preview.payable_amount)}</strong>
              <span>Carry forward</span>
              <strong>{formatMoney(preview.excess_carry_forward)}</strong>
              <p className="full-row">{preview.note}</p>
            </div>
          ) : (
            <EmptyState title="Preview not generated" detail="Select a seat and run preview." />
          )}
        </div>
      </section>

      <RequestsTable
        title="My seat change requests"
        rows={requests}
        columns={[
          ['From', (row) => seatLabel(row.from_seat)],
          ['To', (row) => seatLabel(row.to_seat)],
          ['Date', (row) => formatDate(row.requested_date)],
          ['Payable', (row) => formatMoney(row.payable_amount)],
          ['Status', (row) => <StatusPill status={row.status} />],
        ]}
      />
    </>
  );
}
