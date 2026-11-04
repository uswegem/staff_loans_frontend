// Review screen (prototype #/review/:id; FR-14). The full view shows the request,
// signed agreement, affordability steps, rule checks, applicant, documents and
// history. The Credit Analyst's view (FR-55, D-86) shows only first name, surname, NIDA
// number and mobile.

import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertTitle, Card, CardContent, Chip, Link } from '@mui/material';
import { reviewApi } from '../../api/review';
import { downloadFile } from '../../api/staff';
import { apiError } from '../../api/client';
import { formatDate, formatDateTime, formatNumber, formatTzs } from '../../lib/format';
import LoanRoute from '../../components/LoanRoute';
import AppStatusChip from '../../components/AppStatusChip';
import DueClock from '../../components/DueClock';
import { Breakdown, Meter } from '../apply/CalculatorPanel';
import DecisionPanel from './DecisionPanel';
import s from '../apply/apply.module.css';
import { translate, useT } from '../../i18n';

const ACTION = { create: 'Started', submit: 'Signed agreement and submitted', resubmit: 'Signed a new agreement and resubmitted', approve: 'Approved', return: 'Returned for correction', reject: 'Rejected', withdraw: 'Withdrawn', accept_revised: 'Accepted revised terms', decline_revised: 'Declined revised terms', expire: 'Revised terms expired', disburse: 'Disbursement confirmed' };
const TONE = { approve: 'ok', submit: 'info', resubmit: 'info', return: 'warn', reject: 'bad', accept_revised: 'ok', decline_revised: 'bad', disburse: 'ok' };

function Panel({ title, action, children }) {
  return (
    <Card>
      <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
        <h3>{title}</h3>
        {action}
      </div>
      <CardContent sx={{ p: 3 }}>{children}</CardContent>
    </Card>
  );
}

function Side({ app, onDone }) {
  const t = useT();
  if (app.panel) return <DecisionPanel app={app} onDone={onDone} />;
  return (
    <div style={{ padding: 24 }}>
      <Alert severity="info">
        <AlertTitle>{app.currentStage ? t('With {stage}', { stage: t(app.route.stageLabels[app.route.stages.indexOf(app.currentStage)]) }) : t('No action for you')}</AlertTitle>
        {app.currentStage ? t('This application is not in your queue.') : t(app.statusLabel)}
      </Alert>
    </div>
  );
}

function LimitedReview({ app, onDone }) {
  const t = useT();
  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/queue" color="inherit">{t('Review queue')}</Link> / {app.ref}</div>
      <div className="pagehead">
        <div>
          <h1>{app.applicant.firstName} {app.applicant.lastName}</h1>
          <p>{app.ref}, submitted {formatDate(app.submittedAt)}</p>
        </div>
        <div className="row"><AppStatusChip status={app.status} /><DueClock due={app.due} /></div>
      </div>
      <div className={s.split}>
        <div className="stack">
          <Panel title={t('Details for the credit bureau check')} action={<span className="tag">{t('Shared with you')}</span>}>
            <dl className={s.kv}>
              <dt>{t('First Name')}</dt><dd>{app.applicant.firstName}</dd>
              <dt>{t('Surname')}</dt><dd>{app.applicant.lastName}</dd>
              <dt>{t('NIDA number')}</dt><dd className="num">{app.applicant.nida || t('Not on the profile')}</dd>
              <dt>{t('Mobile number')}</dt><dd>{app.applicant.mobile || '—'}</dd>
            </dl>
          </Panel>
          {app.myDecisions.length > 0 && (
            <Panel title={t('Your decisions')}>
              {app.myDecisions.map((d) => (
                <p key={d.at} className="small" style={{ margin: '0 0 6px' }}><b>{t(ACTION[d.action])}</b>, {formatDateTime(d.at)}{d.comment ? `: ${d.comment}` : ''}</p>
              ))}
            </Panel>
          )}
        </div>
        <Card className={s.sticky}><Side app={app} onDone={onDone} /></Card>
      </div>
    </div>
  );
}

function FullReview({ app, onDone, onError }) {
  const t = useT();
  const q = app.calcAtSubmission;
  const current = app.agreements.find((a) => a.status !== 'void') || app.agreements[0];
  const a = app.applicant;
  const dl = (path, name) => downloadFile(path, name).catch((e) => onError(apiError(e).message));
  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/queue" color="inherit">{t('Review queue')}</Link> / {app.ref}</div>
      <div className="pagehead">
        <div>
          <h1>{a.fullName}, {app.product.name}</h1>
          <p>{app.ref}, submitted {formatDate(app.submittedAt)}{app.cycle > 1 ? ', resubmitted after correction' : ''}</p>
        </div>
        <div className="row"><AppStatusChip status={app.status} /><DueClock due={app.due} /></div>
      </div>
      <Card sx={{ mb: 2.5 }}><CardContent sx={{ p: 3 }}><LoanRoute app={{ ...app, stageDueAt: app.due?.dueAt }} /></CardContent></Card>
      <div className={s.split}>
        <div className="stack">
          <Panel title={t('Loan request')} action={<span className="tag">{t('Signed on these terms')}</span>}>
            <dl className={s.kv}>
              <dt>{t('Product')}</dt><dd>{app.product.name} (version {app.product.version})</dd>
              <dt>{t('Amount')}</dt><dd>{formatTzs(app.amount)}</dd>
              <dt>{t('Tenor')}</dt><dd>{t('{n} months', { n: app.tenor })}</dd>
              <dt>{t('Purpose')}</dt><dd>{app.purpose}</dd>
              {app.product.fields.map((f) => [<dt key={`t${f.key}`}>{f.label}</dt>, <dd key={`d${f.key}`}>{f.type === 'money' ? formatTzs(app.productFields[f.key]) : String(app.productFields[f.key] ?? '—')}</dd>])}
              <dt>{t('Repayment')}</dt><dd>{t('Salary deduction')}</dd>
              {app.topUp?.on && (<><dt>{t('Top-up of')}</dt><dd>{[app.topUp.payslipLine?.label && `${app.topUp.payslipLine.label}, ${t('{amount} a month', { amount: formatTzs(app.topUp.payslipLine.amount) })}`, app.topUp.loanRef].filter(Boolean).join('; ') || '—'}</dd></>)}
              {app.probation.onProbation && (<><dt>{t('Probation reason')}</dt><dd>{app.probation.reason}</dd></>)}
            </dl>
            {app.recommended && <Alert severity="warning" sx={{ mt: 2 }}>{t('Credit Analyst ({name}) recommended {amount} over {n} months', { name: app.recommended.by, amount: formatTzs(app.recommended.amount), n: app.recommended.tenor })}{app.recommended.reason ? `: ${app.recommended.reason}` : ''}.</Alert>}
          </Panel>
          {current && (
            <Panel title={t('Signed agreement')} action={<Link component={RouterLink} to={`/agreement/${current.id}`}>{t('Read agreement')}</Link>}>
              <dl className={s.kv}>
                <dt>{t('Agreement')}</dt><dd>{t('{number}, template {version}', { number: current.number, version: current.templateVersion })}</dd>
                <dt>{t('Signed')}</dt><dd>{t('{when} by {name}', { when: formatDateTime(current.signedAt), name: a.fullName })}</dd>
                <dt>{t('Terms')}</dt><dd>{t('{amount} over {n} months', { amount: formatTzs(current.terms.amount), n: current.terms.tenor })}</dd>
                <dt>{t('Status')}</dt><dd>{current.status === 'in_force' ? t('In force') : current.status === 'void' ? t('Void') : t('Signed, awaiting approval')}</dd>
              </dl>
            </Panel>
          )}
          {q && (
            <Panel title={t('Affordability at submission')} action={q.pass ? <Chip size="small" color="success" label={t('Within limit')} /> : <Chip size="small" color="error" label={t('Over limit')} />}>
              <p className="small" style={{ margin: '0 0 8px' }}>{t('Instalment')}{' '}<b>TZS {formatNumber(q.instalment)}</b>{' '}{t('of a limit of')}{' '}<b>TZS {formatNumber(q.maxInstalment)}</b> {t('({pct}% used).', { pct: Math.round((q.instalment / Math.max(q.maxInstalment, 1)) * 100) })} {t('From the payslip attached to the application.')}</p>
              <Meter q={q} />
              <details open style={{ marginTop: 12 }}>
                <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>{t('Step-by-step calculation')}</summary>
                <div style={{ marginTop: 8, maxWidth: 520 }}><Breakdown q={q} deductions={app.deductions} topUp={app.topUp?.on} /></div>
              </details>
              {app.checks.length ? (
                <Alert severity="error" sx={{ mt: 2 }}><AlertTitle>{t('Rule checks to note')}</AlertTitle><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{app.checks.map((c) => <li key={c}>{c}</li>)}</ul></Alert>
              ) : (
                <p className="small" style={{ marginTop: 12, color: 'var(--ok)', fontWeight: 600 }}>{t('All rule checks pass: service, limits, tenor, retirement date and affordability.')}</p>
              )}
              {app.ruleFlags.map((f) => <Alert key={f} severity="warning" sx={{ mt: 1 }}>{f}</Alert>)}
            </Panel>
          )}
          <Panel title={t('Applicant')}>
            <dl className={s.kv}>
              <dt>{t('Staff number')}</dt><dd>{a.staffNo}</dd>
              <dt>{t('Position')}</dt><dd>{a.title}, {a.department}</dd>
              <dt>{t('Work station')}</dt><dd>{a.station}</dd>
              <dt>{t('Category')}</dt><dd>{a.category}</dd>
              <dt>{t('Route')}</dt><dd>{app.route.label}: {app.route.stageLabels.join(', ')}, then OPS</dd>
              <dt>{t('NIDA number')}</dt><dd>{a.nida || '—'}</dd>
              <dt>{t('Employment')}</dt><dd>{a.employmentType}, joined {formatDate(a.dateJoined)}</dd>
              <dt>{t('Retirement')}</dt><dd>{a.retirementDate ? formatDate(a.retirementDate) : t('No verified date of birth')}</dd>
              <dt>{t('Mobile')}</dt><dd>{a.mobile}</dd>
              <dt>{t('Next of kin')}</dt><dd>{a.nextOfKin ? `${[a.nextOfKin.firstName, a.nextOfKin.lastName].filter(Boolean).join(' ') || a.nextOfKin.name || ''} (${a.nextOfKin.relationship}), ${a.nextOfKin.phone}` : '—'}</dd>
              <dt>{t('Staff loans declared')}</dt><dd>{a.existingLfbLoans.map((l) => `${l.description || t('Staff loan')}${l.instalment ? `: ${t('{amount} a month', { amount: formatTzs(l.instalment) })}` : ''}`).join('; ') || t('None')}</dd>
              <dt>{t('Staff loans in this system')}</dt><dd>{a.runningLoans.map((r) => `${r.ref}, ${formatTzs(r.amount)}`).join('; ') || t('None')}</dd>
            </dl>
          </Panel>
          {app.payslip && (
            <Panel title={t('Payslip')}>
              <dl className={s.kv}>
                <dt>{t('File')}</dt><dd><Link component="button" type="button" onClick={() => dl(`/files/${app.payslip.fileId}`, app.payslip.originalName)}>{app.payslip.originalName}</Link>, {t('dated {date}', { date: formatDate(app.payslip.payDate) })}</dd>
                <dt>{t('Basic Pay read')}</dt><dd>{formatTzs(app.payslip.basic)}</dd>
                <dt>{t('Staff loan deductions read')}</dt><dd>{formatTzs(app.payslip.lfbDeductions)}{app.payslip.lfbLines.length ? <span className="small muted"> ({app.payslip.lfbLines.map((l) => `${l.label} ${formatTzs(l.amount)}`).join('; ')})</span> : null}</dd>
              </dl>
              <p className="xs muted" style={{ margin: '8px 0 0' }}>{t('Read from the PDF when it was attached. Open it to confirm the figures before you decide.')}</p>
            </Panel>
          )}
          {(app.crb || app.appraisalNote || app.arrearsNote) && (
            <Panel title={t('Credit bureau check')}>
              <dl className={s.kv}>
                <dt>{t('Outcome')}</dt><dd>{app.crb ? `${t(app.crb.outcome)}, ${formatDate(app.crb.reportDate)}` : t('Not recorded')}</dd>
                {app.appraisalNote && (<><dt>{t('Appraisal note')}</dt><dd style={{ fontWeight: 400 }}>{app.appraisalNote}</dd></>)}
              </dl>
              {app.arrearsNote && <Alert severity="warning" sx={{ mt: 1.5 }}><AlertTitle>{t('Arrears recorded by Credit (BR-10)')}</AlertTitle>{app.arrearsNote}</Alert>}
            </Panel>
          )}
          <Panel title={t('Documents')}>
            {app.documents.length ? app.documents.map((d) => <div key={d.id}><Link component="button" type="button" onClick={() => dl(`/files/${d.id}`, d.originalName)}>{d.originalName}</Link></div>) : <p className="muted small" style={{ margin: 0 }}>{t('No documents attached. Documents are optional.')}</p>}
            {app.crbReport && <p className="small" style={{ margin: '12px 0 0' }}>{t('Credit bureau report:')}{' '}<Link component="button" type="button" onClick={() => dl(`/files/${app.crbReport.id}`, app.crbReport.originalName)}>{app.crbReport.originalName}</Link></p>}
          </Panel>
          <Panel title={t('History')}>
            <ul className={s.tl}>
              {app.history.map((h) => (
                <li key={`${h.action}${h.at}`}>
                  <span className={`${s.mk} ${TONE[h.action] ? s[TONE[h.action]] : ''}`} />
                  <div style={{ fontWeight: 600 }}>{t(ACTION[h.action])}{h.stageLabel ? ` ${t('by {stage}', { stage: t(h.stageLabel) })}` : ''}</div>
                  <div className={s.when}>{h.by}{h.onBehalfOf ? ` ${t('on behalf of {name}', { name: h.onBehalfOf })}` : ''}, {formatDateTime(h.at)}</div>
                  {h.comment && <div className={s.cmt}>{h.comment}</div>}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <Card className={s.sticky}><Side app={app} onDone={onDone} /></Card>
      </div>
    </div>
  );
}

const DONE = {
  moved: (ref) => translate('{ref} approved and sent to the next stage.', { ref }),
  approved: (ref) => translate('{ref} approved. The signed agreement is in force and OPS has been notified to disburse.', { ref }),
  revised: (ref) => translate('{ref} approved at revised terms. The applicant has been asked to accept the revised agreement.', { ref }),
  returned: (ref) => translate('{ref} returned to the applicant.', { ref }),
  rejected: (ref) => translate('{ref} rejected.', { ref }),
};

export default function ReviewPage() {
  const t = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    reviewApi.get(id).then(setApp).catch((e) => setError(apiError(e)));
  }, [id]);

  if (error && !app) {
    return (
      <div className="page">
        <Alert severity={error.code === 'SELF_REVIEW' ? 'warning' : 'error'}>
          {error.code === 'SELF_REVIEW' ? <><AlertTitle>{t('This is your own application')}</AlertTitle>{t('You cannot review it. It is routed to another approver.')}</> : error.message}
        </Alert>
      </div>
    );
  }
  if (!app) return <p className="muted" role="status">{t('Loading…')}</p>;
  const onDone = (res) => navigate('/queue', { state: { toast: DONE[res.outcome]?.(app.ref), outcome: res.outcome, reference: app.ref } });
  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error.message || error}</Alert>}
      {app.limited ? <LimitedReview app={app} onDone={onDone} /> : <FullReview app={app} onDone={onDone} onError={(m) => setError({ message: m })} />}
    </>
  );
}
