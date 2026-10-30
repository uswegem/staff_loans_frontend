// "Your decision" (prototype decisionPanel; FR-15 to FR-18, FR-42, NS-01). The server
// enforces every check; the panel shows the same messages before sending.

import { useState } from 'react';
import { Alert, AlertTitle, Button, Checkbox, FormControlLabel, MenuItem, TextField } from '@mui/material';
import { reviewApi } from '../../api/review';
import { apiError } from '../../api/client';
import { formatTzs } from '../../lib/format';
import { todayEat } from '../../lib/dates';
import MoneyInput from '../../components/MoneyInput';
import s from '../apply/apply.module.css';

const BUTTON = { approve: 'Approve application', return: 'Return to applicant', reject: 'Reject application' };

export default function DecisionPanel({ app, onDone }) {
  const p = app.panel;
  const [action, setAction] = useState('');
  const [comment, setComment] = useState('');
  const [crb, setCrb] = useState({ outcome: app.crb?.outcome || '', reportDate: app.crb?.reportDate || todayEat(), fileId: app.crb?.fileId || null });
  const [crbFile, setCrbFile] = useState(null);
  const [note, setNote] = useState(app.appraisalNote || '');
  const [arrears, setArrears] = useState('');
  const [rec, setRec] = useState({ amount: null, tenor: '', reason: '' });
  const [checks, setChecks] = useState({ employment: false, category: false, salary: false, probationReasonVerified: false });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const finalText = p.isFinal
    ? app.recommended
      ? 'Final approval at the recommended terms. The applicant accepts the revised agreement, then OPS disburses.'
      : 'Final approval. The signed agreement takes effect and OPS disburses.'
    : `Moves to ${p.nextStageLabel}.`;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!action) return setError('Choose approve, return or reject.');
    if (action !== 'approve' && !comment.trim()) return setError('Add a comment so the applicant knows what to do.');
    if (p.needsCrb && action === 'approve' && !crb.outcome) return setError('Record the credit bureau outcome before approving.');
    if (p.needsHrChecks && action === 'approve' && !(checks.employment && checks.category && checks.salary)) return setError('Confirm all three staff record checks before approving.');
    if (p.needsProbationCheck && action === 'approve' && !checks.probationReasonVerified) return setError('Verify the probation reason before approving.');
    setBusy(true);
    try {
      const body = { action, comment };
      if (p.needsCrb) {
        let fileId = crb.fileId;
        if (crbFile) fileId = (await reviewApi.crbReport(app.id, crbFile)).id;
        if (crb.outcome) body.crb = { outcome: crb.outcome, reportDate: crb.reportDate, ...(fileId ? { fileId } : {}) };
        if (note) body.appraisalNote = note;
        if (arrears) body.arrearsNote = arrears;
        if (p.canRecommend && action === 'approve' && (rec.amount || rec.tenor)) {
          body.recommended = { amount: rec.amount || app.amount, tenor: Number(rec.tenor) || app.tenor, reason: rec.reason };
        }
        if (p.canRecommend && action === 'return' && (rec.amount || rec.tenor)) body.suggested = { amount: rec.amount || app.amount, tenor: Number(rec.tenor) || app.tenor };
      }
      if (p.needsHrChecks) body.hrChecks = checks;
      const res = await reviewApi.decide(app.id, body);
      onDone(res);
    } catch (err) {
      setError(apiError(err).message);
      setBusy(false);
    }
    return undefined;
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
        <h3>Your decision</h3>
        {p.onBehalfOf && <span className="tag">On behalf of {p.onBehalfOf}</span>}
      </div>
      <div style={{ padding: 24, display: 'grid', gap: 12 }}>
        {p.stage === 'pcm' && <Alert severity="info"><AlertTitle>The Head of People and Culture is the applicant</AlertTitle>You review in place of the Head of HR. After you approve, the CEO gives final approval.</Alert>}
        {p.stage === 'hr' && app.route?.key === 'ceo' && <Alert severity="info"><AlertTitle>The CEO is the applicant</AlertTitle>On this route the CEO stage is skipped. You give final approval after the Credit Analyst, then OPS disburses.</Alert>}
        {p.stage === 'ceo' && app.route?.key === 'hrhead' && <Alert severity="info"><AlertTitle>The Head of People and Culture is the applicant</AlertTitle>The People and Culture Manager reviewed in place of the Head of HR. You give final approval.</Alert>}
        {app.recommended && !p.needsCrb && (
          <Alert severity="warning">
            <AlertTitle>Recommended at revised terms</AlertTitle>
            {formatTzs(app.recommended.amount)} over {app.recommended.tenor} months, instead of the signed {formatTzs(app.amount)} over {app.tenor}. After final approval the applicant must accept a revised agreement.
          </Alert>
        )}

        {p.needsCrb && (
          <>
            <h4>Credit bureau check</h4>
            <p className="xs muted" style={{ margin: 0 }}>{app.limited ? 'Search the bureau with the name, mobile and NIDA number, then record the result.' : 'Run the check in the bureau portal, then record it here.'}</p>
            <div className={s.grid}>
              <TextField select label="Outcome" required value={crb.outcome} onChange={(e) => setCrb({ ...crb, outcome: e.target.value })}>
                {p.crbOutcomes.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField label="Report date" type="date" required value={crb.reportDate} onChange={(e) => setCrb({ ...crb, reportDate: e.target.value })} />
            </div>
            <TextField label="Report (optional)" type="file" inputProps={{ accept: '.pdf,.jpg,.jpeg,.png' }} onChange={(e) => setCrbFile(e.target.files[0] || null)} />
            <TextField label={app.limited ? 'Bureau note' : 'Appraisal note'} multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={app.limited ? 'What the bureau report shows' : 'Repayment history, anything later approvers should know'} />
            {!app.limited && <TextField label="Arrears on existing staff loans (BR-10)" value={arrears} onChange={(e) => setArrears(e.target.value)} helperText="Later approvers must comment on any arrears you record." />}
            {p.canRecommend && (
              <>
                <div className={s.grid}>
                  <MoneyInput label="Recommended amount" value={rec.amount} onChange={(v) => setRec({ ...rec, amount: v })} helperText="Leave blank to keep the signed terms" />
                  <TextField label="Recommended tenor" type="number" value={rec.tenor} onChange={(e) => setRec({ ...rec, tenor: e.target.value })} placeholder={String(app.tenor)} helperText="Months" />
                </div>
                {(rec.amount || rec.tenor) && <TextField label="Why" value={rec.reason} onChange={(e) => setRec({ ...rec, reason: e.target.value })} />}
                <p className="xs muted" style={{ margin: 0 }}>If you approve at different terms, later approvers see your recommendation and the applicant accepts a revised agreement after final approval. Recommended terms must pass the product limits and affordability.</p>
              </>
            )}
            <hr style={{ border: 0, borderTop: '1px solid var(--line-2)', width: '100%' }} />
          </>
        )}

        {p.needsHrChecks && (
          <>
            <h4>Confirm the staff record</h4>
            <FormControlLabel control={<Checkbox checked={checks.employment} onChange={(e) => setChecks({ ...checks, employment: e.target.checked })} />} label={`Employment status is ${app.applicant.employmentType.toLowerCase()} and active`} />
            <FormControlLabel control={<Checkbox checked={checks.category} onChange={(e) => setChecks({ ...checks, category: e.target.checked })} />} label={`Category is ${app.applicant.category}`} />
            <FormControlLabel control={<Checkbox checked={checks.salary} onChange={(e) => setChecks({ ...checks, salary: e.target.checked })} />} label={`Basic salary of ${formatTzs(app.applicant.salaryAtSubmission?.basic)} matches payroll`} />
            {p.needsProbationCheck && (
              <Alert severity="warning" icon={false}>
                <AlertTitle>Applied during probation</AlertTitle>
                <p className="small" style={{ margin: '0 0 6px' }}>Reason given: {app.probation.reason}</p>
                <FormControlLabel control={<Checkbox checked={checks.probationReasonVerified} onChange={(e) => setChecks({ ...checks, probationReasonVerified: e.target.checked })} />} label="I have verified the probation reason" />
              </Alert>
            )}
            <hr style={{ border: 0, borderTop: '1px solid var(--line-2)', width: '100%' }} />
          </>
        )}

        {p.stage === 'ceo' && (
          <>
            <h4>Recommendations</h4>
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
              {(app.history || []).filter((h) => h.action === 'approve').map((h) => (
                <li key={`${h.stage}${h.at}`}><b>{h.stageLabel}</b> approved{h.comment ? `: ${h.comment}` : ''}</li>
              ))}
            </ul>
            <p className="small" style={{ margin: 0 }}>{app.crb ? <>Credit bureau: <b>{app.crb.outcome}</b>, {app.crb.reportDate}</> : 'No credit bureau check recorded.'}</p>
            <hr style={{ border: 0, borderTop: '1px solid var(--line-2)', width: '100%' }} />
          </>
        )}

        <div className={s.radios} role="radiogroup" aria-label="Decision">
          {[
            ['approve', 'Approve', finalText],
            ['return', 'Return for correction', 'Goes back to the applicant, then restarts at the first stage.'],
            ['reject', 'Reject', 'Closes the application.'],
          ].map(([k, label, hint]) => (
            <label key={k} className={s.radioCard}>
              <input type="radio" name="decision" value={k} checked={action === k} onChange={() => setAction(k)} />
              <span><b>{label}</b><span className="small muted">{hint}</span></span>
            </label>
          ))}
        </div>
        <TextField label="Comment" required={!!action && action !== 'approve'} multiline minRows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Visible to the applicant and later approvers" helperText="Required to return or reject." />
        {error && <p className="small" role="alert" style={{ color: 'var(--bad)', fontWeight: 600, margin: 0 }}>{error}</p>}
        <Button type="submit" variant="contained" fullWidth disabled={busy}>{BUTTON[action] || 'Record decision'}</Button>
      </div>
    </form>
  );
}
