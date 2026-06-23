export function formatMoney(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} BDT`;
}

export function formatDate(value) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function seatLabel(seat) {
  if (!seat) return 'No seat assigned';
  const room = seat.room?.name ? `${seat.room.name} / ` : '';
  const branch = seat.room?.branch?.name ? ` - ${seat.room.branch.name}` : '';
  return `${room}${seat.label}${branch}`;
}
