export default function PageTitle({ title, subtitle }) {
  return (
    <header className="page-title">
      <div>
        <span>Hostel Management System</span>
        <h1>{title}</h1>
      </div>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}
