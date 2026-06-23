import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageTitle from '../../components/shared/PageTitle';
import SectionHeader from '../../components/shared/SectionHeader';
import EmptyState from '../../components/shared/EmptyState';
import StatusPill from '../../components/shared/StatusPill';
import LoadingBlock from '../../components/shared/LoadingBlock';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/format';

export default function NotificationsPage() {
  const { notify } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await apiClient.get('/notifications');
      setData(data);
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

  async function markAllRead() {
    try {
      const { data } = await apiClient.post('/notifications/read-all', {});
      notify(data.message);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function markRead(id) {
    try {
      const { data } = await apiClient.put(`/notifications/${id}/read`, {});
      notify(data.message);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageTitle title="Notifications" subtitle={`${data?.unread_count || 0} unread notifications`} />
      <div className="panel">
        <SectionHeader
          title="Inbox"
          action={
            <button type="button" className="secondary-action" onClick={markAllRead}>
              Mark all read
            </button>
          }
        />
        {data?.notifications?.length ? (
          <div className="item-list">
            {data.notifications.map((item) => (
              <article className={`list-item stacked ${item.read_at ? '' : 'unread'}`} key={item.id}>
                <div className="row-between">
                  <strong>{item.title}</strong>
                  <StatusPill status={item.type} />
                </div>
                <span>{item.body}</span>
                <small>{formatDate(item.created_at)}</small>
                {!item.read_at && item.user_id && (
                  <button className="text-action" type="button" onClick={() => markRead(item.id)}>
                    Mark read
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No notifications" detail="Your inbox is clear." />
        )}
      </div>
    </>
  );
}
