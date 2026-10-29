// Progress meter from the prototype (.meter): black track fill on a pale line.

export default function Meter({ value, max, label }) {
  const pctDone = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="row small" style={{ justifyContent: 'space-between' }}>
        <span>{label}</span>
        <b>{pctDone}%</b>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} style={{ height: 8, borderRadius: 4, background: 'var(--line-2)', marginTop: 6, overflow: 'hidden' }}>
        <i style={{ display: 'block', height: '100%', width: `${pctDone}%`, background: pctDone === 100 ? 'var(--ok)' : 'var(--y)' }} />
      </div>
    </div>
  );
}
