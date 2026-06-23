export default function ActionButtons({ onApprove, onReject }) {
  return (
    <div className="button-row table-actions">
      <button className="primary-action slim" type="button" onClick={onApprove}>
        Approve
      </button>
      <button className="danger-action slim" type="button" onClick={onReject}>
        Reject
      </button>
    </div>
  );
}
