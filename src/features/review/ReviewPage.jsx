// Review screen (prototype #/review/:id; FR-14). The full view shows the request,
// signed agreement, affordability steps, rule checks, applicant, documents and
// history. The limited view (FR-55) shows only name, mobile and NIDA number.

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
  if (app.panel) return <DecisionPanel app={app} onDone={onDone} />;
  return (
    <div style={{ padding: 24 }}>
      <Alert severity="info">
        <AlertTitle>{app.currentStage ? `With ${app.route.stageLabels[app.route.stages.indexOf(app.currentStage)]}` : 'No action for you'}</AlertTitle>
        {app.currentStage ? 'This application is not in your queue.' : app.statusLabel}
      </Alert>
    </div>
  );
}

function LimitedReview({ app, onDone }) {
  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/queue" color="inherit">Review queue</Link> / {app.ref}</div>
      <div className="pagehead">
        <div>
          <h1>{app.applicant.fullName}</h1>
          <p>{app.ref}, {app.route.label.toLowerCase()} route, submitted {formatDate(app.submittedAt)}</p>
        </div>
        <div className="row"><AppStatusChip status={app.status} /><DueClock due={app.due} /></div>
      </div>
      <div className={s.split}>
        <div className="stack">
          <Alert severity="info">
            <AlertTitle>Limited details for a management application</AlertTitle>
            For management staff, the CEO and the Head of People and Culture, the Credit Analyst receives only the name, mobile number and NIDA number. Use them for the credit bureau check. The loan terms, salary, documents and agreement are not shared with you.
          </Alert>
          <Panel title="Details for the credit bureau check" action={<span className="tag">Shared with you</span>}>
            <dl className={s.kv}>
              <dt>Full name</dt><dd>{app.applicant.fullName}</dd>
              <dt>Mobile number</dt><dd>{app.applicant.mobile || '—'}</dd>
              <dt>NIDA number</dt><dd className="num">{app.applicant.nida || 'Not on the profile'}</dd>
            </dl>
          </Panel>
          <Panel title="Not shared on this route">
            <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Product, amount, tenor and purpose</li>
              <li>Salary, deductions and affordability</li>
              <li>Position, employment record and next of kin</li>
              <li>Supporting documents and the signed agreement</li>
              <li>Other reviewers&apos; comments</li>
            </ul>
          </Panel>
          {app.myDecisions.length > 0 && (
            <Panel title="Your decisions">
              {app.myDecisions.map((d) => (
                <p key={d.at} className="small" style={{ margin: '0 0 6px' }}><b>{ACTION[d.action]}</b>, {formatDateTime(d.at)}{d.comment ? `: ${d.comment}` : ''}</p>
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
  const q = app.calcAtSubmission;
  const current = app.agreements.find((a) => a.status !== 'void') || app.agreements[0];
  const a = app.applicant;
  const dl = (path, name) => downloadFile(path, name).catch((e) => onError(apiError(e).message));
  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/queue" color="inherit">Review queue</Link> / {app.ref}</div>
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
          <Panel title="Loan request" action={<span className="tag">Signed on these terms</span>}>
            <dl className={s.kv}>
              <dt>Product</dt><dd>{app.product.name} (version {app.product.version})</dd>
              <dt>Amount</dt><dd>{formatTzs(app.amount)}</dd>
              <dt>Tenor</dt><dd>{app.tenor} months</dd>
              <dt>Purpose</dt><dd>{app.purpose}</dd>
              {app.product.fields.map((f) => [<dt key={`t${f.key}`}>{f.label}</dt>, <dd key={`d${f.key}`}>{f.type === 'money' ? formatTzs(app.productFields[f.key]) : String(app.productFields[f.key] ?? '—')}</dd>])}
              <dt>Repayment</dt><dd>{app.repayment.method === 'payroll' ? 'Payroll deduction' : `Debit from ${app.repayment.bank}, ${app.repayment.branch}, account ${app.repayment.accountNo}`}</dd>
              {app.topUp?.on && (<><dt>Top-up of</dt><dd>{app.topUp.loanRef}, instalment {formatTzs(app.topUp.instalment)}</dd></>)}
              {app.probation.onProbation && (<><dt>Probation reason</dt><dd>{app.probation.reason}</dd></>)}
            </dl>
            {app.recommended && <Alert severity="warning" sx={{ mt: 2 }}>Credit Analyst ({app.recommended.by}) recommended {formatTzs(app.recommended.amount)} over {app.recommended.tenor} months{app.recommended.reason ? `: ${app.recommended.reason}` : ''}.</Alert>}
          </Panel>
          {current && (
            <Panel title="Signed agreement" action={<Link component={RouterLink} to={`/agreement/${current.id}`}>Read agreement</Link>}>
              <dl className={s.kv}>
                <dt>Agreement</dt><dd>{current.number}, template {current.templateVersion}</dd>
                <dt>Signed</dt><dd>{formatDateTime(current.signedAt)} by {a.fullName}</dd>
                <dt>Terms</dt><dd>{formatTzs(current.terms.amount)} over {current.terms.tenor} months</dd>
                <dt>Status</dt><dd>{current.status === 'in_force' ? 'In force' : current.status === 'void' ? 'Void' : 'Signed, awaiting approval'}</dd>
              </dl>
            </Panel>
          )}
          {q && (
            <Panel title="Affordability at submission" action={q.pass ? <Chip size="small" color="success" label="Within limit" /> : <Chip size="small" color="error" label="Over limit" />}>
              <p className="small" style={{ margin: '0 0 8px' }}>Instalment <b>TZS {formatNumber(q.instalment)}</b> of a limit of <b>TZS {formatNumber(q.maxInstalment)}</b> ({Math.round((q.instalment / Math.max(q.maxInstalment, 1)) * 100)}% used). Salary in force on the submission date (FR-03).</p>
              <Meter q={q} />
              <details open style={{ marginTop: 12 }}>
                <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>Step-by-step calculation</summary>
                <div style={{ marginTop: 8, maxWidth: 520 }}><Breakdown q={q} /></div>
              </details>
              {app.checks.length ? (
                <Alert severity="error" sx={{ mt: 2 }}><AlertTitle>Rule checks to note</AlertTitle><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{app.checks.map((c) => <li key={c}>{c}</li>)}</ul></Alert>
              ) : (
                <p className="small" style={{ marginTop: 12, color: 'var(--ok)', fontWeight: 600 }}>All rule checks pass: service, limits, tenor, retirement date and affordability.</p>
              )}
              {app.ruleFlags.map((f) => <Alert key={f} severity="warning" sx={{ mt: 1 }}>{f}</Alert>)}
              {app.arrearsNote && <Alert severity="warning" sx={{ mt: 1 }}><AlertTitle>Arrears recorded by Credit (BR-10)</AlertTitle>{app.arrearsNote}</Alert>}
            </Panel>
          )}
          <Panel title="Applicant">
            <dl className={s.kv}>
              <dt>Staff number</dt><dd>{a.staffNo}</dd>
              <dt>Position</dt><dd>{a.title}, {a.department}</dd>
              <dt>Work station</dt><dd>{a.station}</dd>
              <dt>Category</dt><dd>{a.category}</dd>
              <dt>Route</dt><dd>{app.route.label}: {app.route.stageLabels.join(', ')}, then OPS</dd>
              <dt>NIDA number</dt><dd>{a.nida || '—'}</dd>
              <dt>Employment</dt><dd>{a.employmentType}, joined {formatDate(a.dateJoined)}</dd>
              <dt>Retirement</dt><dd>{formatDate(a.retirementDate)}</dd>
              <dt>Mobile</dt><dd>{a.mobile}</dd>
              <dt>Next of kin</dt><dd>{a.nextOfKin ? `${a.nextOfKin.name} (${a.nextOfKin.relationship}), ${a.nextOfKin.phone}` : '—'}</dd>
              <dt>Staff loans declared</dt><dd>{a.existingLfbLoans.map((l) => `${l.description || 'Staff loan'}${l.instalment ? `: ${formatTzs(l.instalment)} a month` : ''}`).join('; ') || 'None'}</dd>
              <dt>Staff loans in this system</dt><dd>{a.runningLoans.map((r) => `${r.ref}, ${formatTzs(r.amount)}`).join('; ') || 'None'}</dd>
            </dl>
          </Panel>
          {app.payslip && (
            <Panel title="Payslip">
              <dl className={s.kv}>
                <dt>File</dt><dd><Link component="button" type="button" onClick={() => dl(`/files/${app.payslip.fileId}`, app.payslip.originalName)}>{app.payslip.originalName}</Link>, dated {formatDate(app.payslip.payDate)}</dd>
                <dt>Basic Pay read</dt><dd>{formatTzs(app.payslip.basic)}{a.salaryAtSubmission?.basic && a.salaryAtSubmission.basic !== app.payslip.basic ? <span className="small" style={{ color: 'var(--bad)' }}> (staff record: {formatTzs(a.salaryAtSubmission.basic)})</span> : null}</dd>
                <dt>LFB deductions read</dt><dd>{formatTzs(app.payslip.lfbDeductions)}{app.payslip.lfbLines.length ? <span className="small muted"> ({app.payslip.lfbLines.map((l) => `${l.label} ${formatTzs(l.amount)}`).join('; ')})</span> : null}</dd>
              </dl>
              <p className="xs muted" style={{ margin: '8px 0 0' }}>Read from the PDF when it was attached. Open it to confirm the figures before you decide.</p>
            </Panel>
          )}
          <Panel title="Documents">
            {app.documents.length ? app.documents.map((d) => <div key={d.id}><Link component="button" type="button" onClick={() => dl(`/files/${d.id}`, d.originalName)}>{d.originalName}</Link></div>) : <p className="muted small" style={{ margin: 0 }}>No documents attached. Documents are optional.</p>}
            {app.crbReport && <p className="small" style={{ margin: '12px 0 0' }}>Credit bureau report: <Link component="button" type="button" onClick={() => dl(`/files/${app.crbReport.id}`, app.crbReport.originalName)}>{app.crbReport.originalName}</Link></p>}
          </Panel>
          <Panel title="History">
            <ul className={s.tl}>
              {app.history.map((h) => (
                <li key={`${h.action}${h.at}`}>
                  <span className={`${s.mk} ${TONE[h.action] ? s[TONE[h.action]] : ''}`} />
                  <div style={{ fontWeight: 600 }}>{ACTION[h.action]}{h.stageLabel ? ` by ${h.stageLabel}` : ''}</div>
                  <div className={s.when}>{h.by}{h.onBehalfOf ? ` on behalf of ${h.onBehalfOf}` : ''}, {formatDateTime(h.at)}</div>
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
  moved: (ref) => `${ref} approved and sent to the next stage.`,
  approved: (ref) => `${ref} approved. The signed agreement is in force and OPS has been notified to disburse.`,
  revised: (ref) => `${ref} approved at revised terms. The applicant has been asked to accept the revised agreement.`,
  returned: (ref) => `${ref} returned to the applicant.`,
  rejected: (ref) => `${ref} rejected.`,
};

export default function ReviewPage() {
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
          {error.code === 'SELF_REVIEW' ? <><AlertTitle>This is your own application</AlertTitle>You cannot review it. It is routed to another approver.</> : error.message}
        </Alert>
      </div>
    );
  }
  if (!app) return <p className="muted" role="status">Loading…</p>;
  const onDone = (res) => navigate('/queue', { state: { toast: DONE[res.outcome]?.(app.ref) } });
  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error.message || error}</Alert>}
      {app.limited ? <LimitedReview app={app} onDone={onDone} /> : <FullReview app={app} onDone={onDone} onError={(m) => setError({ message: m })} />}
    </>
  );
}
