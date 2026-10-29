// The loan route (prototype component): chevron stages that echo the Letshego
// triangle. States: done, now (black with yellow, time left), back (returned), stop.

import s from '../features/apply/apply.module.css';

const STAGE_STATUS = { credit: 'pending_credit', pcm: 'pending_pcm', hr: 'pending_hr', ceo: 'pending_ceo' };

function hoursLeft(due) {
  if (!due) return null;
  const ms = new Date(due).getTime() - Date.now();
  if (ms <= 0) return 'Overdue';
  return null;
}

/** route: { stages, stageLabels }; status, currentStage, closedAtStage, stageDueAt from the API. */
export function routeSteps({ route, status, closedAtStage }) {
  const revised = ['pending_reaccept', 'declined'].includes(status);
  const steps = [
    { key: 'submit', label: 'Signed and submitted' },
    ...route.stages.map((k, i) => ({ key: k, label: route.stageLabels[i] })),
    ...(revised ? [{ key: 'reaccept', label: 'Accept revised terms' }] : []),
    { key: 'disburse', label: 'Disbursed' },
  ];
  const idxOf = (k) => steps.findIndex((x) => x.key === k);
  const nowIdx = {
    pending_reaccept: idxOf('reaccept'),
    pending_disbursement: steps.length - 1,
    disbursed: steps.length,
    ...Object.fromEntries(Object.entries(STAGE_STATUS).map(([k, st]) => [st, idxOf(k)])),
  }[status];
  return steps.map((st, i) => {
    let cls = '';
    if (status === 'declined') cls = st.key === 'reaccept' ? 'stop' : i < idxOf('reaccept') ? 'done' : '';
    else if (status === 'rejected' || status === 'withdrawn') {
      const at = closedAtStage ? idxOf(closedAtStage) : 0;
      cls = i < at ? 'done' : i === Math.max(at, 0) ? 'stop' : '';
    } else if (status === 'returned') cls = i === 0 ? 'back' : '';
    else if (status === 'draft') cls = i === 0 ? 'now' : '';
    else cls = i < nowIdx ? 'done' : i === nowIdx ? 'now' : '';
    return { ...st, cls };
  });
}

const SUB = { done: 'Done', back: 'Returned to you' };

export default function LoanRoute({ app, compact }) {
  const steps = routeSteps(app);
  const sub = (st) => {
    if (st.cls === 'now') {
      if (st.key === 'disburse') return 'With OPS';
      if (st.key === 'reaccept') return 'Your action';
      if (st.key === 'submit') return 'Draft';
      return hoursLeft(app.stageDueAt) || 'In progress';
    }
    if (st.cls === 'stop') return app.statusLabel;
    return SUB[st.cls] || '';
  };
  return (
    <div className={`${s.route} ${compact ? s.compact : ''}`} role="list" aria-label="Application progress">
      {steps.map((st) => (
        <div key={st.key} className={`${s.st} ${st.cls ? s[st.cls] : ''}`} role="listitem" aria-current={st.cls === 'now' ? 'step' : undefined}>
          {st.label}
          <span>{sub(st)}</span>
        </div>
      ))}
    </div>
  );
}
