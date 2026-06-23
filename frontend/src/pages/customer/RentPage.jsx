import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageTitle from '../../components/shared/PageTitle';
import StatCard from '../../components/shared/StatCard';
import SectionHeader from '../../components/shared/SectionHeader';
import StatusPill from '../../components/shared/StatusPill';
import RequestsTable from '../../components/shared/RequestsTable';
import LoadingBlock from '../../components/shared/LoadingBlock';
import { useToast } from '../../hooks/useToast';
import { fieldsFromErrors } from '../../utils/errors';
import { formatMoney, formatDate } from '../../utils/format';

export default function RentPage() {
  const { notify } = useToast();
  const [data, setData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ bill_id: '', amount: '', method: 'bkash' });
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [billsRes, historyRes] = await Promise.all([
        apiClient.get('/rent/bills'),
        apiClient.get('/rent/history'),
      ]);
      setData(billsRes.data);
      setPayments(historyRes.data);
      const dueBill = billsRes.data.bills?.find((bill) => bill.status !== 'paid');
      setForm((current) => ({
        ...current,
        bill_id: current.bill_id || dueBill?.id?.toString() || '',
        amount: current.amount || (dueBill ? String(Number(dueBill.amount_due) - Number(dueBill.amount_paid)) : ''),
      }));
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
      const { data } = await apiClient.post('/rent/pay', {
        bill_id: form.bill_id || undefined,
        amount: form.amount,
        method: form.method,
      });
      notify(data.message);
      setForm({ bill_id: '', amount: '', method: 'bkash' });
      await load();
    } catch (err) {
      notify(fieldsFromErrors(err.errors) || err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageTitle title="Rent" subtitle="Review bills, balance, and payment history." />
      <section className="stat-grid">
        <StatCard label="Current balance" value={formatMoney(data?.current_balance)} />
        <StatCard label="Consumed rent" value={formatMoney(data?.consumed_rent)} />
        <StatCard label="Covered days" value={data?.remaining_days_coverage || 0} />
      </section>

      <section className="two-column align-start">
        <div className="panel">
          <SectionHeader title="Bills" />
          <div className="item-list">
            {data?.bills?.map((bill) => (
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
        </div>

        <form className="panel form-grid" onSubmit={submit}>
          <SectionHeader title="Record payment" />
          <label>
            Bill
            <select
              value={form.bill_id}
              onChange={(e) => setForm((current) => ({ ...current, bill_id: e.target.value }))}
            >
              <option value="">Advance payment</option>
              {data?.bills?.map((bill) => (
                <option value={bill.id} key={bill.id}>
                  {bill.period_month} - {bill.status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount
            <input
              type="number"
              min="1"
              step="1"
              value={form.amount}
              onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
              required
            />
          </label>
          <label>
            Method
            <select
              value={form.method}
              onChange={(e) => setForm((current) => ({ ...current, method: e.target.value }))}
            >
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
          </label>
          <button className="primary-action" type="submit">
            Pay rent
          </button>
        </form>
      </section>

      <RequestsTable
        title="Payment history"
        rows={payments}
        columns={[
          ['Date', (row) => formatDate(row.paid_at || row.created_at)],
          ['Type', (row) => row.type],
          ['Direction', (row) => row.direction],
          ['Method', (row) => row.method || 'N/A'],
          ['Amount', (row) => formatMoney(row.amount)],
          ['Status', (row) => <StatusPill status={row.status} />],
        ]}
      />
    </>
  );
}
