// Review screen (prototype #/review/:id; FR-14). The full view shows the request,
// signed agreement, affordability steps, rule checks, applicant, documents and
// history. The Credit Analyst's view (FR-55, D-86, D-102) shows the first name, surname,
// NIDA number and mobile, the product and requested terms, and affordability without pay.
// An Auditor's full view leaves out the payslip and salary details (D-102).

import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, CardContent, Chip, Link } from '@mui/material';
import { reviewApi } from '../../api/review';
import { downloadFile } from '../../api/staff';
import SupportingDocuments from '../../components/SupportingDocuments';
import { apiError } from '../../api/client';
import { formatDate, formatDateTime, formatNumber, formatTzs, payslipDate } from '../../lib/format';
import LoanRoute from '../../components/LoanRoute';
import AppStatusChip from '../../components/AppStatusChip';
import DueClock from '../../components/DueClock';
import ScheduleDownload from '../../components/ScheduleDownload';
import LoadingSkeleton from '../../components/ux/LoadingSkeleton';
import { Breakdown, Meter } from '../apply/CalculatorPanel';
import DecisionPanel from './DecisionPanel';
import s from '../apply/apply.module.css';
import { translate, useT } from '../../i18n';
import CardHeader from '../../components/CardHeader';
import { formatPhone } from '../../lib/formats';
import { statusLabel } from '../../lib/statuses';

const ACTION = { create: 'Started', submit: 'Signed agreement and submitted', resubmit: 'Signed a new agreement and resubmitted', approve: 'Approved', return: 'Returned for correction', reject: 'Rejected', withdraw: 'Withdrawn', accept_revised: 'Accepted revised terms', decline_revised: 'Declined revised terms', expire: 'Revised terms expired', book: 'Booked in core banking', disburse: 'Disbursement confirmed' };
const TONE = { book: 'ok', approve: 'ok', submit: 'info', resubmit: 'info', return: 'warn', reject: 'bad', accept_revised: 'ok', decline_revised: 'bad', disburse: 'ok' };

/** A titled card; collapsed starts it closed with a one-click "Show" (detail most decisions do not need). */
function Panel({ title, action, children, collapsed = false }) {
  const t = useT();
  const [open, setOpen] = useState(!collapsed);
  return (
    <Card>
      <CardHeader
        title={title}
        action={collapsed ? <Button size="small" variant="text" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? t('Hide') : t('Show')}</Button> : action}
      />
      {open && <CardContent sx={{ p: 3 }}>{children}</CardContent>}
    </Card>
  );
}

/** Whether a documents card has anything to show: required documents, files, or the bureau report. */
const hasDocuments = (app) => (app.documentChecklist || []).length > 0 || (app.documents || []).length > 0 || (app.crbReports || []).length > 0;

function Side({ app, onDone }) {
  const t = useT();
  if (app.panel) return <DecisionPanel app={app} onDone={onDone} />;
  return (
    <div style={{ padding: 24 }}>
      <Alert severity="info">
        <AlertTitle>{app.currentStage ? t('With {stage}', { stage: t(app.route.stageLabels[app.route.stages.indexOf(app.currentStage)]) }) : t('No action for you')}</AlertTitle>
        {app.currentStage ? t('This application is not in your queue.') : statusLabel(app.status, app.statusLabel)}
      </Alert>
    </div>
  );
}

/** Instalment, Room and what remains, without the pay behind them (D-102). */
function AffordabilitySummary({ a }) {
  const t = useT();
  return (
    <dl className={s.kv}>
      <dt>{t('Monthly instalment')}</dt><dd>{formatTzs(a.instalment)}</dd>
      <dt>{t('Room: the instalment the applicant can afford')}</dt><dd>{formatTzs(a.room)}</dd>
      <dt>{t('Remaining after this loan')}</dt><dd style={a.remaining < 0 ? { color: 'var(--bad)' } : undefined}>{formatTzs(a.remaining)}</dd>
      <dt>{t('Largest loan')}</dt><dd>{t('{amount} over {n} months', { amount: formatTzs(a.maxAmount), n: a.maxTenor })}</dd>
    </dl>
  );
}

function fitsChip(t, a) {
  return a.fits ? <Chip size="small" color="success" label={t('Within limit')} /> : <Chip size="small" color="error" label={t('Over limit')} />;
}

function LimitedReview({ app, onDone }) {
  const t = useT();
  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/queue" color="inherit">{t('Review queue')}</Link> / {app.ref}</div>
      <div className="pagehead">
        <div>
          <h1>{app.applicant.firstName} {app.applicant.lastName}</h1>
          <p>{t('{ref}, submitted {date}', { ref: app.ref, date: formatDate(app.submittedAt) })}</p>
        </div>
        <div className="row"><ScheduleDownload id={app.id} reference={app.ref} status={app.status} /><AppStatusChip status={app.status} /><DueClock due={app.due} /></div>
      </div>
      <div className={s.split}>
        <div className="stack">
          <Panel title={t('Details for the credit bureau check')} action={<span className="tag">{t('Shared with you')}</span>}>
            <dl className={s.kv}>
              <dt>{t('First Name')}</dt><dd>{app.applicant.firstName}</dd>
              <dt>{t('Surname')}</dt><dd>{app.applicant.lastName}</dd>
              <dt>{t('NIDA number')}</dt><dd className="num">{app.applicant.nida || t('Not on the profile')}</dd>
              <dt>{t('Mobile number')}</dt><dd>{app.applicant.mobile ? formatPhone(app.applicant.mobile) : t('Not on the profile')}</dd>
            </dl>
          </Panel>
          <Panel title={t('Loan request')}>
            <dl className={s.kv}>
              <dt>{t('Product')}</dt><dd>{app.product?.name || '—'}</dd>
              <dt>{t('Amount')}</dt><dd>{formatTzs(app.amount)}</dd>
              <dt>{t('Tenor')}</dt><dd>{t('{n} months', { n: app.tenor })}</dd>
              <dt>{t('Purpose')}</dt><dd>{app.purpose}</dd>
            </dl>
          </Panel>
          {app.affordability && (
            <Panel title={t('Affordability at submission')} action={fitsChip(t, app.affordability)}>
              <AffordabilitySummary a={app.affordability} />
              <p className="xs muted" style={{ margin: '8px 0 0' }}>{t('Worked out from the payslip; pay details are not shared with you.')}</p>
            </Panel>
          )}
          {hasDocuments(app) && (
            <Panel title={t('Supporting documents')}>
              <SupportingDocuments documents={app.documents || []} documentChecklist={app.documentChecklist || []} />
            </Panel>
          )}
          {app.myDecisions.length > 0 && (
            <Panel title={t('Your decisions')}>
              {app.myDecisions.map((d) => (
                <p key={d.at} className="small" style={{ margin: '0 0 6px' }}><b>{t(ACTION[d.action])}</b>, {formatDateTime(d.at)}{d.comment ? `: ${d.comment}` : ''}</p>
              ))}
            </Panel>
          )}
        </div>
        <Card className={`${s.sticky} ${s.decisionCard}`}><Side app={app} onDone={onDone} /></Card>
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
          <p>{t('{ref}, submitted {date}', { ref: app.ref, date: formatDate(app.submittedAt) })}{app.cycle > 1 ? `, ${t('resubmitted after correction')}` : ''}</p>
        </div>
        <div className="row"><ScheduleDownload id={app.id} reference={app.ref} status={app.status} onError={onError} /><AppStatusChip status={app.status} /><DueClock due={app.due} /></div>
      </div>
      <div className={s.split}>
        <div className="stack">
          {/* The route sits in the content column so the decision panel starts at the top. */}
          <Card><CardContent sx={{ p: 3 }}><LoanRoute app={{ ...app, stageDueAt: app.due?.dueAt }} /></CardContent></Card>
          <Panel title={t('Loan request')} action={<span className="tag">{t('Signed on these terms')}</span>}>
            <dl className={s.kv}>
              <dt>{t('Product')}</dt><dd>{app.product.name} {t('(version {n})', { n: app.product.version })}</dd>
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
              <Meter q={q} viewer="reviewer" />
              <details style={{ marginTop: 12 }}>
                <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>{t('Step-by-step calculation')}</summary>
                <div style={{ marginTop: 8, maxWidth: 520 }}><Breakdown q={q} deductions={app.deductions} topUp={app.topUp?.on} viewer="reviewer" /></div>
              </details>
              {app.checks.length ? (
                <Alert severity="error" sx={{ mt: 2 }}><AlertTitle>{t('Rule checks to note')}</AlertTitle><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{app.checks.map((c) => <li key={c}>{c}</li>)}</ul></Alert>
              ) : (
                <p className="small" style={{ marginTop: 12, color: 'var(--ok)', fontWeight: 600 }}>{t('All rule checks pass: service, limits, tenor, retirement date and affordability.')}</p>
              )}
              {app.ruleFlags.map((f) => <Alert key={f} severity="warning" sx={{ mt: 1 }}>{t(f)}</Alert>)}
            </Panel>
          )}
          {!q && app.affordability && (
            <Panel title={t('Affordability at submission')} action={fitsChip(t, app.affordability)}>
              <AffordabilitySummary a={app.affordability} />
              {app.payHidden && <p className="xs muted" style={{ margin: '8px 0 0' }}>{t('Payslip and salary details are not shown to Auditors.')}</p>}
              {app.checks.length > 0 && <Alert severity="error" sx={{ mt: 2 }}><AlertTitle>{t('Rule checks to note')}</AlertTitle><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{app.checks.map((c) => <li key={c}>{c}</li>)}</ul></Alert>}
              {app.ruleFlags.map((f) => <Alert key={f} severity="warning" sx={{ mt: 1 }}>{t(f)}</Alert>)}
            </Panel>
          )}
          <Panel title={t('Applicant')} collapsed>
            <dl className={s.kv}>
              <dt>{t('Staff number')}</dt><dd>{a.staffNo}</dd>
              <dt>{t('Position')}</dt><dd>{a.title}, {a.department}</dd>
              <dt>{t('Work station')}</dt><dd>{a.station}</dd>
              <dt>{t('Category')}</dt><dd>{a.category}</dd>
              <dt>{t('Route')}</dt><dd>{t(app.route.label)}: {app.route.stageLabels.map((l) => t(l)).join(', ')}, {t('then Disbursement (People and Culture book, OPS disburse)')}</dd>
              <dt>{t('NIDA number')}</dt><dd>{a.nida || '—'}</dd>
              <dt>{t('Employment')}</dt><dd>{t('{type}, joined {date}', { type: t(a.employmentType), date: formatDate(a.dateJoined) })}</dd>
              <dt>{t('Retirement')}</dt><dd>{a.retirementDate ? formatDate(a.retirementDate) : t('No verified date of birth')}</dd>
              <dt>{t('Mobile')}</dt><dd>{formatPhone(a.mobile)}</dd>
              <dt>{t('Next of kin')}</dt><dd>{a.nextOfKin ? `${[a.nextOfKin.firstName, a.nextOfKin.lastName].filter(Boolean).join(' ') || a.nextOfKin.name || ''} (${a.nextOfKin.relationship}), ${a.nextOfKin.phone}` : '—'}</dd>
              {!app.payHidden && <dt>{t('Staff loans declared')}</dt>}{!app.payHidden && <dd>{a.existingLfbLoans.map((l) => `${l.description || t('Staff loan')}${l.instalment ? `: ${t('{amount} a month', { amount: formatTzs(l.instalment) })}` : ''}`).join('; ') || t('None')}</dd>}
              <dt>{t('Staff loans in this system')}</dt><dd>{a.runningLoans.map((r) => `${r.ref}, ${formatTzs(r.amount)}`).join('; ') || t('None')}</dd>
            </dl>
          </Panel>
          {app.payslip && (
            <Panel title={t('Payslip')}>
              <dl className={s.kv}>
                <dt>{t('File')}</dt><dd><Link component="button" type="button" onClick={() => dl(`/files/${app.payslip.fileId}`, app.payslip.originalName)}>{app.payslip.originalName}</Link>, {payslipDate(app.payslip.payDate).month ? t('pay month {month}', { month: payslipDate(app.payslip.payDate).text }) : t('dated {date}', { date: payslipDate(app.payslip.payDate).text })}</dd>
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
              {app.arrearsNote && <Alert severity="warning" sx={{ mt: 1.5 }}><AlertTitle>{t('Arrears recorded by Credit')}</AlertTitle>{app.arrearsNote}</Alert>}
            </Panel>
          )}
          {hasDocuments(app) && (
            <Panel title={t('Documents')}>
              {((app.documentChecklist || []).length > 0 || (app.documents || []).length > 0) && <SupportingDocuments documents={app.documents} documentChecklist={app.documentChecklist} />}
              {(app.crbReports || []).length > 0 && (
                <div className="small" style={{ margin: '12px 0 0' }}>
                  {t('Credit bureau reports:')}
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {app.crbReports.map((f) => <li key={f.id}><Link component="button" type="button" onClick={() => dl(`/files/${f.id}`, f.originalName)}>{f.originalName}</Link>{f.uploadedBy ? <span className="muted">{`, ${f.uploadedBy}`}</span> : null}</li>)}
                  </ul>
                </div>
              )}
              {app.dataProtection && <p className="small" style={{ margin: '12px 0 0' }}>{t('Data protection notice {version} accepted on {date}.', { version: app.dataProtection.version, date: formatDateTime(app.dataProtection.at) })}</p>}
            </Panel>
          )}
          <Panel title={t('History')}>
            <ul className={s.tl}>
              {app.history.map((h) => (
                <li key={`${h.action}${h.at}`}>
                  <span className={`${s.mk} ${TONE[h.action] ? s[TONE[h.action]] : ''}`} />
                  <div style={{ fontWeight: 600 }}>
                    {h.action === 'return' && h.returnTo && h.returnTo !== 'applicant'
                      ? t('Returned by {stage} to {to}', { stage: t(h.stageLabel), to: t(h.returnToLabel) })
                      : <>{t(ACTION[h.action])}{h.stageLabel ? ` ${t('by {stage}', { stage: t(h.stageLabel) })}` : ''}</>}
                    {h.superseded && <span className="tag" style={{ marginLeft: 6 }}>{t('Cancelled by a later return')}</span>}
                  </div>
                  <div className={s.when}>{h.by}{h.onBehalfOf ? ` ${t('on behalf of {name}', { name: h.onBehalfOf })}` : ''}, {formatDateTime(h.at)}</div>
                  {h.comment && <div className={s.cmt}>{h.comment}</div>}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <Card className={`${s.sticky} ${s.decisionCard}`}><Side app={app} onDone={onDone} /></Card>
      </div>
    </div>
  );
}

const DONE = {
  moved: (ref) => translate('{ref} approved and sent to the next stage.', { ref }),
  approved: (ref) => translate('{ref} approved. The signed agreement is in force and People and Culture have been notified to book the loan.', { ref }),
  revised: (ref) => translate('{ref} approved at revised terms. The applicant has been asked to accept the revised agreement.', { ref }),
  returned: (ref) => translate('{ref} returned to the applicant.', { ref }),
  returned_to_stage: (ref) => translate('{ref} returned to an earlier stage.', { ref }),
  rejected: (ref) => translate('{ref} rejected.', { ref }),
};

export default function ReviewPage() {
  const t = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [error, setError] = useState(null);

  const location = useLocation();
  const [notice, setNotice] = useState(location.state?.toast || null);

  useEffect(() => {
    setApp(null);
    setNotice(location.state?.toast || null);
    reviewApi.get(id).then(setApp).catch((e) => setError(apiError(e)));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !app) {
    return (
      <div className="page">
        <Alert severity={error.code === 'SELF_REVIEW' ? 'warning' : 'error'}>
          {error.code === 'SELF_REVIEW' ? <><AlertTitle>{t('This is your own application')}</AlertTitle>{t('You cannot review it. It is routed to another approver.')}</> : error.message}
        </Alert>
      </div>
    );
  }
  if (!app) return <div className="page"><LoadingSkeleton label={t('Loading…')} rows={4} /></div>;
  // After a decision: straight on to the next application waiting, or back to an empty queue.
  const onDone = async (res) => {
    const toast = DONE[res.outcome]?.(app.ref);
    let next = null;
    try {
      next = (await reviewApi.queue('waiting')).items.find((i) => i.id !== app.id) || null;
    } catch {
      next = null;
    }
    if (next) navigate(`/review/${next.id}`, { state: { toast } });
    else navigate('/queue', { state: { toast, outcome: res.outcome, reference: app.ref, empty: true } });
  };
  return (
    <>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice} {t('This is the next application waiting for you.')}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error.message || error}</Alert>}
      {app.limited ? <LimitedReview app={app} onDone={onDone} /> : <FullReview app={app} onDone={onDone} onError={(m) => setError({ message: m })} />}
    </>
  );
}
