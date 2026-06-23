import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageTitle from '../../components/shared/PageTitle';
import EmptyState from '../../components/shared/EmptyState';
import StatusPill from '../../components/shared/StatusPill';
import LoadingBlock from '../../components/shared/LoadingBlock';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/format';

export default function AnnouncementsPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiClient
      .get('/announcements')
      .then((res) => mounted && setRows(res.data))
      .catch((err) => notify(err.message, 'error'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [notify]);

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageTitle title="Announcements" subtitle="Published hostel notices." />
      <div className="announcement-grid">
        {rows.length ? (
          rows.map((item) => (
            <article className="announcement-card" key={item.id}>
              <div className="row-between">
                <StatusPill status={item.audience} />
                <small>{formatDate(item.published_at)}</small>
              </div>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))
        ) : (
          <EmptyState title="No announcements" detail="Published notices will appear here." />
        )}
      </div>
    </>
  );
}
