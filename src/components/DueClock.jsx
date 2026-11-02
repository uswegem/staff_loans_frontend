// Working-hours clock for a stage (FR-13): time left, or overdue (prototype dueHtml).

import { translate, useT } from '../i18n';

function hm(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return hh ? (mm ? translate('{h} h {m} min', { h: hh, m: mm }) : translate('{h} h', { h: hh })) : translate('{m} min', { m: mm });
}

export default function DueClock({ due }) {
  const t = useT();
  if (!due) return null;
  if (due.overdue) return <span className="small" style={{ color: 'var(--bad)', fontWeight: 700 }}>{t('Overdue by {time}', { time: hm(due.hoursOverdue) })}</span>;
  return <span className="small" style={{ color: due.hoursLeft < 2 ? 'var(--warn)' : 'var(--ok)', fontWeight: 600 }}>{t('{time} left', { time: hm(due.hoursLeft) })}</span>;
}
