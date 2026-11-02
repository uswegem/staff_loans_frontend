// "Your decision" (prototype decisionPanel; FR-15 to FR-18, FR-42, NS-01). The server
// enforces every check; the panel shows the same messages before sending.

import { useState } from 'react';
import { Alert, AlertTitle, Button, Checkbox, FormControlLabel, MenuItem, TextField } from '@mui/material';
import { reviewApi } from '../../api/review';
import { apiError } from '../../api/client';
import { formatTzs } from '../../lib/format';
import { todayEat } from '../../lib/dates';
import FileDrop from '../../components/FileDrop';
import s from '../apply/apply.module.css';
import { useT } from '../../i18n';

const BUTTON = { approve: 'Approve application', return: 'Return to applicant', reject: 'Reject application' };

export default function DecisionPanel({ app, onDone }) {
  const t = useT();
  const p = app.panel;
  const [action, setAction] = useState('');
  const [comment, setComment] = useState('');
  const [crb, setCrb] = useState({ outcome: app.crb?.outcome || '', reportDate: app.crb?.reportDate || todayEat(), fileId: app.crb?.fileId || null });
  const [crbFile, setCrbFile] = useState(null);
  const [note, setNote] = useState(app.appraisalNote || '');
  const [arrears, setArrears] = useState('');
  const [checks, setChecks] = useState({ employment: false, category: false, salary: false, probationReasonVerified: false });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const finalText = p.isFinal
    ? app.recommended
      ? t('Final approval at the recommended terms. The applicant accepts the revised agreement, then OPS disburses.')
      : t('Final approval. The signed agreement takes effect and OPS disburses.')
    : t('Moves to {stage}.', { stage: t(p.nextStageLabel) });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!action) return setError(t('Choose approve, return or reject.'));
    if (action !== 'approve' && !comment.trim()) return setError(t('Add a comment so the applicant knows what to do.'));
    if (p.needsCrb && action === 'approve' && !crb.outcome) return setError(t('Record the credit bureau outcome before approving.'));
    if (p.needsHrChecks && action === 'approve' && !(checks.employment && checks.category && checks.salary)) return setError(t('Confirm all three staff record checks before approving.'));
    if (p.needsProbationCheck && action === 'approve' && !checks.probationReasonVerified) return setError(t('Verify the probation reason before approving.'));
    setBusy(true);
    try {
      const body = { action, comment };
      if (p.needsCrb) {
        let fileId = crb.fileId;
        if (crbFile) fileId = (await reviewApi.crbReport(app.id, crbFile)).id;
        if (crb.outcome) body.crb = { outcome: crb.outcome, reportDate: crb.reportDate, ...(fileId ? { fileId } : {}) };
        if (note) body.appraisalNote = note;
        if (arrears) body.arrearsNote = arrears;
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
        <h3>{t('Your decision')}</h3>
        {p.onBehalfOf && <span className="tag">{t('On behalf of {name}', { name: p.onBehalfOf })}</span>}
      </div>
      <div style={{ padding: 24, display: 'grid', gap: 12 }}>
        {p.stage === 'pcm' && <Alert severity="info"><AlertTitle>{t('The Head of People and Culture is the applicant')}</AlertTitle>{t('You review in place of the Head of HR. After you approve, the CEO gives final approval.')}</Alert>}
        {p.stage === 'hr' && app.route?.key === 'ceo' && <Alert severity="info"><AlertTitle>{t('The CEO is the applicant')}</AlertTitle>{t('On this route the CEO stage is skipped. You give final approval after the Credit Analyst, then OPS disburses.')}</Alert>}
        {p.stage === 'ceo' && app.route?.key === 'hrhead' && <Alert severity="info"><AlertTitle>{t('The Head of People and Culture is the applicant')}</AlertTitle>{t('The People and Culture Manager reviewed in place of the Head of HR. You give final approval.')}</Alert>}
        {app.recommended && !p.needsCrb && (
          <Alert severity="warning">
            <AlertTitle>{t('Recommended at revised terms')}</AlertTitle>
            {t('{amount} over {n} months, instead of the signed {signed} over {signedTenor}.', { amount: formatTzs(app.recommended.amount), n: app.recommended.tenor, signed: formatTzs(app.amount), signedTenor: app.tenor })} {t('After final approval the applicant must accept a revised agreement.')}
          </Alert>
        )}

        {p.needsCrb && (
          <>
            <h4>{t('Credit bureau check')}</h4>
            <p className="xs muted" style={{ margin: 0 }}>{t('Search the bureau with the name, NIDA number and mobile, then record the result.')}</p>
            <div className={s.grid}>
              <TextField select label={t('Outcome')} required value={crb.outcome} onChange={(e) => setCrb({ ...crb, outcome: e.target.value })}>
                {p.crbOutcomes.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
              <TextField label={t('Report date')} type="date" required value={crb.reportDate} onChange={(e) => setCrb({ ...crb, reportDate: e.target.value })} />
            </div>
            <div>
              <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>{t('Report (optional)')}</div>
              <FileDrop accept=".pdf,.jpg,.jpeg,.png" label={t('The bureau report')} inputLabel={t('Choose bureau report')} buttonLabel={t('Choose file')} hint={crbFile ? t('Attached: {name}', { name: crbFile.name }) : t('PDF, JPG or PNG.')} onFile={setCrbFile} />
            </div>
            <TextField label={t('Appraisal note')} multiline minRows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('What the bureau report shows, anything later approvers should know')} />
            <TextField label={t('Arrears on existing staff loans (BR-10)')} value={arrears} onChange={(e) => setArrears(e.target.value)} helperText={t('Later approvers must comment on any arrears you record.')} />
            <hr style={{ border: 0, borderTop: '1px solid var(--line-2)', width: '100%' }} />
          </>
        )}

        {p.needsHrChecks && (
          <>
            <h4>{t('Confirm the staff record')}</h4>
            <FormControlLabel control={<Checkbox checked={checks.employment} onChange={(e) => setChecks({ ...checks, employment: e.target.checked })} />} label={t('Employment status is {type} and active', { type: t(app.applicant.employmentType).toLowerCase() })} />
            <FormControlLabel control={<Checkbox checked={checks.category} onChange={(e) => setChecks({ ...checks, category: e.target.checked })} />} label={t('Category is {category}', { category: t(app.applicant.category) })} />
            <FormControlLabel control={<Checkbox checked={checks.salary} onChange={(e) => setChecks({ ...checks, salary: e.target.checked })} />} label={t('Basic Pay of {amount} on the payslip matches payroll', { amount: formatTzs(app.payslip?.basic ?? app.applicant.salaryAtSubmission?.basic) })} />
            {p.needsProbationCheck && (
              <Alert severity="warning" icon={false}>
                <AlertTitle>{t('Applied during probation')}</AlertTitle>
                <p className="small" style={{ margin: '0 0 6px' }}>{t('Reason given:')} {app.probation.reason}</p>
                <FormControlLabel control={<Checkbox checked={checks.probationReasonVerified} onChange={(e) => setChecks({ ...checks, probationReasonVerified: e.target.checked })} />} label={t('I have verified the probation reason')} />
              </Alert>
            )}
            <hr style={{ border: 0, borderTop: '1px solid var(--line-2)', width: '100%' }} />
          </>
        )}

        {p.stage === 'ceo' && (
          <>
            <h4>{t('Recommendations')}</h4>
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
              {(app.history || []).filter((h) => h.action === 'approve').map((h) => (
                <li key={`${h.stage}${h.at}`}><b>{h.stageLabel}</b> approved{h.comment ? `: ${h.comment}` : ''}</li>
              ))}
            </ul>
            <p className="small" style={{ margin: 0 }}>{app.crb ? <>{t('Credit bureau:')}{' '}<b>{app.crb.outcome}</b>, {app.crb.reportDate}</> : t('No credit bureau check recorded.')}</p>
            <hr style={{ border: 0, borderTop: '1px solid var(--line-2)', width: '100%' }} />
          </>
        )}

        <div className={s.radios} role="radiogroup" aria-label={t('Decision')}>
          {[
            ['approve', t('Approve'), finalText],
            ['return', t('Return for correction'), t('Goes back to the applicant, then restarts at the first stage.')],
            ['reject', t('Reject'), t('Closes the application.')],
          ].map(([k, label, hint]) => (
            <label key={k} className={s.radioCard}>
              <input type="radio" name="decision" value={k} checked={action === k} onChange={() => setAction(k)} />
              <span><b>{label}</b><span className="small muted">{hint}</span></span>
            </label>
          ))}
        </div>
        <TextField label={t('Comment')} required={!!action && action !== 'approve'} multiline minRows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('Visible to the applicant and later approvers')} helperText={t('Required to return or reject.')} />
        {error && <p className="small" role="alert" style={{ color: 'var(--bad)', fontWeight: 600, margin: 0 }}>{error}</p>}
        <Button type="submit" variant="contained" fullWidth disabled={busy}>{BUTTON[action] ? t(BUTTON[action]) : t('Record decision')}</Button>
      </div>
    </form>
  );
}
