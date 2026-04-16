export default function LatencyBadge({ ms, label }) {
  if (ms == null) return null;

  let colorClass;
  if (ms < 50) {
    colorClass = 'bg-green-900/50 text-green-400 border-green-800';
  } else if (ms <= 200) {
    colorClass = 'bg-yellow-900/50 text-yellow-400 border-yellow-800';
  } else {
    colorClass = 'bg-red-900/50 text-red-400 border-red-800';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-mono font-semibold ${colorClass}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {ms.toFixed(1)} ms{label ? ` ${label}` : ''}
    </span>
  );
}
