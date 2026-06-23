import SectionHeader from './SectionHeader';
import EmptyState from './EmptyState';
import { formatDate } from '../../utils/format';

export default function FeedPanel({ title, items = [] }) {
  return (
    <div className="panel">
      <SectionHeader title={title} />
      {items.length ? (
        <div className="item-list">
          {items.map((item) => (
            <article className="list-item stacked" key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
              <small>{formatDate(item.created_at || item.published_at)}</small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing here yet" detail="New updates will appear here." />
      )}
    </div>
  );
}
