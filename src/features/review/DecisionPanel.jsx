// "Your decision" (prototype decisionPanel; FR-15 to FR-18, FR-42, NS-01). The server
// enforces every check; the panel shows the same messages before sending.

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, AlertTitle, Button, Checkbox, FormControlLabel, Link, MenuItem, TextField } from '@mui/material';
import { downloadFile } from '../../api/staff';
import { reviewApi } from '../../api/review';
import { apiError } from '../../api/client';
import { formatTzs } from '../../lib/format';
import { todayEat } from '../../lib/dates';
import FileDrop from '../../components/FileDrop';
import s from '../apply/apply.module.css';
import { useT } from '../../i18n';
import DateField from '../../components/fields/DateField';


export default function DecisionPanel({ app, onDone }) {
  const t = useT();
  const p = app.panel;
  const [action, setAction] = useState('');
  const [comment, setComment] = useState('');
  // An outcome recorded before D-99 (Clear, Adverse: …) is shown on the review, not offered again.
  const [crb, setCrb] = useState({ outcome: p?.crbOutcomes?.includes(app.crb?.outcome) ? app.crb.outcome : '', reportDate: app.crb?.reportDate || todayEat() });
  // D-105: every bureau report file attached so far; each upload adds one.
  const [crbFiles, setCrbFiles] = useState(app.crbReports || []);
  const [uploading, setUploading] = useState(false);
  const me = useSelector((st) => st.auth.user?.id);
  // D-106: where a return goes; the stage just before this one is proposed first.
  const targets = p.returnTargets?.length ? p.returnTargets : [{ key: 'applicant', label: 'Applicant (for correction)' }];
  const [returnTo, setReturnTo] = useState(targets[0].key);
  const [checks, setChecks] = useState({ employment: false, category: false, salary: false, probationReasonVerified: false });
  // error: what the API said about the last submit; the checks below follow the current choices.
  const [error, setError] = useState(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  const finalText = p.isFinal
    ? app.recommended
      ? t('Final approval at the recommended terms. The applicant accepts the revised agreement, then Disbursement (People and Culture or OPS).')
      : t('Final approval. The signed agreement takes effect, then Disbursement (People and Culture or OPS).')
    : t('Moves to {stage}.', { stage: t(p.nextStageLabel) });

  // The button says what will happen: where an approval goes, whom a return goes to.
  const applicantFirst = app.applicant?.firstName || (app.applicant?.fullName || '').split(' ')[0];
  const buttonLabel = action === 'approve'
    ? p.isFinal ? t('Approve (final approval)') : t('Approve and send to {stage}', { stage: t(p.nextStageLabel) })
    : action === 'return' && returnTo !== 'applicant' ? t('Return to {stage}', { stage: t(targets.find((x) => x.key === returnTo)?.label) })
    : action === 'return' ? (applicantFirst ? t('Return to {name}', { name: applicantFirst }) : t('Return to applicant'))
      : action === 'reject' ? t('Reject application') : t('Choose a decision');

  /** What still stops this decision, from the current choices (null when it can be sent). */
  const blocker = () => {
    if (!action) return t('Choose approve, return or reject.');
    if (action !== 'approve' && !comment.trim()) return t('Add a comment so the applicant knows what to do.');
    if (p.needsCrb && action === 'approve' && !crb.outcome) return t('Record the credit bureau outcome before approving.');
    if (p.needsCrb && action === 'approve' && !crb.reportDate) return t('Enter the credit bureau report date before approving.');
    if (p.needsCrb && action === 'approve' && !crbFiles.length) return t('Attach at least one credit bureau report before approving.');
    if (p.needsHrChecks && action === 'approve' && !(checks.employment && checks.category && checks.salary)) return t('Confirm all three staff record checks before approving.');
    if (p.needsProbationCheck && action === 'approve' && !checks.probationReasonVerified) return t('Verify the probation reason before approving.');
    return null;
  };
  // Shown once a submit was tried, and re-checked on every change: it goes when it is put right.
  const problem = (tried && blocker()) || error;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return undefined;
    setError(null);
    setTried(true);
    if (blocker()) return undefined;
    setBusy(true);
    try {
      const body = { action, comment };
      if (action === 'return') body.returnTo = returnTo;
      if (p.needsCrb && crb.outcome) body.crb = { outcome: crb.outcome, reportDate: crb.reportDate };
      if (p.needsHrChecks) body.hrChecks = checks;
      const res = await reviewApi.decide(app.id, body);
      onDone(res);
    } catch (err) {
      setError(apiError(err).message);
      setBusy(false);
    }
    return undefined;
  };

  const addCrbFile = async (file) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const f = await reviewApi.crbReport(app.id, file);
      setCrbFiles((list) => [...list, { ...f, uploadedById: me }]);
    } catch (err) {
      setError(apiError(err).message);
    }
    setUploading(false);
  };
  const removeCrbFile = async (f) => {
    setError(null);
    try {
      await reviewApi.removeCrbReport(app.id, f.id);
      setCrbFiles((list) => list.filter((x) => x.id !== f.id));
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
        <h3>{t('Your decision')}</h3>
        {p.onBehalfOf && <span className="tag">{t('On behalf of {name}', { name: p.onBehalfOf })}</span>}
      </div>
      <div className={s.decisionBody} style={{ padding: 24, display: 'grid', gap: 12, alignContent: 'start' }}>
        {p.stage === 'pc' && app.route?.key !== 'hrhead' && <Alert severity="info"><AlertTitle>{t('People and Culture stage')}</AlertTitle>{t('The People and Culture Manager or the Head of People and Culture decides this stage, whoever acts first. Once one of you decides, it leaves the other\'s queue.')}</Alert>}
        {(p.stage === 'pcm' || (p.stage === 'pc' && app.route?.key === 'hrhead')) && <Alert severity="info"><AlertTitle>{t('The Head of People and Culture is the applicant')}</AlertTitle>{t('You review in place of the Head of HR. After you approve, the CEO gives final approval.')}</Alert>}
        {p.stage === 'hr' && app.route?.key === 'ceo' && <Alert severity="info"><AlertTitle>{t('The CEO is the applicant')}</AlertTitle>{t('On this route the CEO stage is skipped. You give final approval after the Credit Analyst, then Disbursement (People and Culture or OPS).')}</Alert>}
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
                {p.crbOutcomes.map((o) => <MenuItem key={o} value={o}>{t(o)}</MenuItem>)}
              </TextField>
              <DateField label={t('Report date')} required value={crb.reportDate} onChange={(e) => setCrb({ ...crb, reportDate: e.target.value })} />
            </div>
            <div>
              <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>{t('Bureau reports (at least one)')}</div>
              {crbFiles.length > 0 && (
                <ul className="small" style={{ margin: '0 0 8px', paddingLeft: 18 }} aria-label={t('Bureau reports attached')}>
                  {crbFiles.map((f) => (
                    <li key={f.id}>
                      <Link component="button" type="button" onClick={() => downloadFile(`/files/${f.id}`, f.originalName)}>{f.originalName}</Link>
                      {String(f.uploadedById) === String(me) && <>{' '}<Link component="button" type="button" color="error" onClick={() => removeCrbFile(f)}>{t('Remove')}</Link></>}
                    </li>
                  ))}
                </ul>
              )}
              {crbFiles.length < 10 && (
                <FileDrop accept=".pdf,.jpg,.jpeg,.png" label={t('The bureau report')} inputLabel={t('Choose bureau report')} buttonLabel={uploading ? t('Uploading…') : t('Add file')} hint={t('PDF, JPG or PNG, up to 10 MB each, at most 10 files.')} onFile={addCrbFile} />
              )}
            </div>
            <hr style={{ border: 0, borderTop: '1px solid var(--line-2)', width: '100%' }} />
          </>
        )}

        {p.needsHrChecks && (
          <>
            <h4>{t('Confirm the staff record')}</h4>
            <FormControlLabel control={<Checkbox checked={checks.employment} onChange={(e) => setChecks({ ...checks, employment: e.target.checked })} />} label={app.applicant.employmentType ? t('Employment status is {type} and active', { type: t(app.applicant.employmentType).toLowerCase() }) : t('Employment is active')} />
            <FormControlLabel control={<Checkbox checked={checks.category} onChange={(e) => setChecks({ ...checks, category: e.target.checked })} />} label={t('Category is {category}', { category: t(app.applicant.category) })} />
            <FormControlLabel control={<Checkbox checked={checks.salary} onChange={(e) => setChecks({ ...checks, salary: e.target.checked })} />} label={t('Basic Pay of {amount} confirmed from the attached payslip', { amount: formatTzs(app.payslip?.basic) })} />
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
            <p className="small" style={{ margin: 0 }}>{app.crb ? <>{t('Credit bureau:')}{' '}<b>{t(app.crb.outcome)}</b>, {app.crb.reportDate}</> : t('No credit bureau check recorded.')}</p>
            <hr style={{ border: 0, borderTop: '1px solid var(--line-2)', width: '100%' }} />
          </>
        )}

        <div className={s.radios} role="radiogroup" aria-label={t('Decision')}>
          {[
            ['approve', t('Approve'), finalText],
            ['return', targets.length > 1 ? t('Return') : t('Return for correction'), targets.length > 1 ? t('Back to an earlier stage, or to the applicant for correction.') : t('Goes back to the applicant, then restarts at the first stage.')],
            ['reject', t('Reject'), t('Closes the application.')],
          ].map(([k, label, hint]) => (
            <label key={k} className={s.radioCard}>
              <input type="radio" name="decision" value={k} checked={action === k} onChange={() => setAction(k)} />
              <span><b>{label}</b><span className="small muted">{hint}</span></span>
            </label>
          ))}
        </div>
        {action === 'return' && targets.length > 1 && (
          <TextField select label={t('Return to')} value={returnTo} onChange={(e) => setReturnTo(e.target.value)} helperText={returnTo === 'applicant' ? t('Goes back to the applicant, then restarts at the first stage.') : t('Approvals from that stage on are cancelled and given again.')}>
            {targets.map((x) => <MenuItem key={x.key} value={x.key}>{t(x.label)}</MenuItem>)}
          </TextField>
        )}
        <TextField label={t('Comment')} required={!!action && action !== 'approve'} multiline minRows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('Visible to the applicant and later approvers')} helperText={t('Required to return or reject.')} />
      </div>
      <div className={s.decisionFoot}>
        {problem && <p className="small" role="alert" style={{ color: 'var(--bad)', fontWeight: 600, margin: '0 0 8px' }}>{problem}</p>}
        <Button type="submit" variant="contained" fullWidth disabled={busy}>{buttonLabel}</Button>
      </div>
    </form>
  );
}
