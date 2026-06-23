import { adminNav, customerNav } from './navConfig';

export default function AppShell({ user, view, setView, onLogout, children }) {
  const nav = user.role === 'admin' ? adminNav : customerNav;

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-block compact">
          <span className="brand-mark">HM</span>
          <div>
            <strong>Hostel MS</strong>
            <span>{user.role === 'admin' ? 'Admin console' : 'Resident portal'}</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Primary">
          {nav.map(([key, label]) => (
            <button
              className={view === key ? 'active' : ''}
              type="button"
              key={key}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="user-strip">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="content-shell">{children}</main>
    </div>
  );
}
