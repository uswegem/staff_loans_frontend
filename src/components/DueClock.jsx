// Working-hours clock for a stage (FR-13): time left, or overdue (prototype dueHtml).

function hm(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return hh ? `${hh} h${mm ? ` ${mm} min` : ''}` : `${mm} min`;
}

export default function DueClock({ due }) {
  if (!due) return null;
  if (due.overdue) return <span className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>Overdue by {hm(due.hoursOverdue)}</span>;
  return <span className="small" style={{ color: due.hoursLeft < 2 ? 'var(--warn)' : 'var(--ok)', fontWeight: 600 }}>{hm(due.hoursLeft)} left</span>;
}
