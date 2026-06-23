import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageTitle from '../../components/shared/PageTitle';
import SectionHeader from '../../components/shared/SectionHeader';
import EmptyState from '../../components/shared/EmptyState';
import StatusPill from '../../components/shared/StatusPill';
import LoadingBlock from '../../components/shared/LoadingBlock';
import { useToast } from '../../hooks/useToast';
import { fieldsFromErrors } from '../../utils/errors';
import { formatDate } from '../../utils/format';

export default function AdminAnnouncements() {
  const { notify } = useToast();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' });
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await apiClient.get('/admin/announcements');
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
      const { data } = await apiClient.post('/admin/announcements', form);
      notify(data.message);
      setForm({ title: '', body: '', audience: 'all' });
      await load();
    } catch (err) {
      notify(fieldsFromErrors(err.errors) || err.message, 'error');
    }
  }

  async function destroy(id) {
    try {
      const { data } = await apiClient.delete(`/admin/announcements/${id}`);
      notify(data.message);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageTitle title="Announcements" subtitle="Publish notices to residents." />
      <section className="two-column align-start">
        <form className="panel form-grid" onSubmit={submit}>
          <SectionHeader title="Publish notice" />
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              required
            />
          </label>
          <label>
            Audience
            <select
              value={form.audience}
              onChange={(e) => setForm((current) => ({ ...current, audience: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="customers">Customers</option>
            </select>
          </label>
          <label>
            Body
            <textarea
              value={form.body}
              onChange={(e) => setForm((current) => ({ ...current, body: e.target.value }))}
              rows="5"
              required
            />
          </label>
          <button className="primary-action" type="submit">
            Publish
          </button>
        </form>

        <div className="panel">
          <SectionHeader title="Published notices" />
          {rows.length ? (
            <div className="item-list">
              {rows.map((item) => (
                <article className="list-item stacked" key={item.id}>
                  <div className="row-between">
                    <strong>{item.title}</strong>
                    <StatusPill status={item.audience} />
                  </div>
                  <span>{item.body}</span>
                  <div className="row-between">
                    <small>{formatDate(item.published_at)}</small>
                    <button className="text-action danger-text" type="button" onClick={() => destroy(item.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No notices" detail="Published notices will appear here." />
          )}
        </div>
      </section>
    </>
  );
}
