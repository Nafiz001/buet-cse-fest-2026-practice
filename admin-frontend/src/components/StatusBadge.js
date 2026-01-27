export default function StatusBadge({ status, approved }) {
  if (typeof approved === 'boolean') {
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          approved
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {approved ? 'APPROVED' : 'REJECTED'}
      </span>
    );
  }

  const colors = {
    AVAILABLE: 'bg-green-100 text-green-800',
    BUSY: 'bg-yellow-100 text-yellow-800',
    PENDING: 'bg-blue-100 text-blue-800',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        colors[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status}
    </span>
  );
}
