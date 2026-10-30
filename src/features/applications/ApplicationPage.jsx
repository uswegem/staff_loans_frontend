// One of my applications (prototype #/applications/:id; FR-11, 7.3): progress route,
// history with comments, the terms, agreement, documents, the repayment schedule
// (FR-25), correct or withdraw.

import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Link, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { applicationsApi } from '../../api/applications';
import { downloadFile } from '../../api/staff';
import { apiError } from '../../api/client';
import { formatDate, formatDateTime, formatNumber, formatTzs } from '../../lib/format';
import LoanRoute from '../../components/LoanRoute';
import AppStatusChip from '../../components/AppStatusChip';
import s from '../apply/apply.module.css';

const ACTIONS = {
  create: ['Started', ''],
  submit: ['Signed agreement and submitted', 'info'],
  resubmit: ['Signed a new agreement and resubmitted', 'info'],
  approve: ['Approved', 'ok'],
  return: ['Returned for correction', 'warn'],
  reject: ['Rejected', 'bad'],
  withdraw: ['Withdrawn', ''],
  accept_revised: ['Accepted revised terms', 'ok'],
  decline_revised: ['Declined revised terms', 'bad'],
  disburse: ['Disbursement confirmed', 'ok'],
};

function Schedule({ app }) {
  const [all, setAll] = useState(false);
  const rows = all ? app.schedule : app.schedule.slice(0, 6);
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <h3 style={{ marginBottom: 4 }}>Repayment schedule</h3>
        <p className="small muted" style={{ margin: '0 0 12px' }}>
          {app.scheduleBasis === 'disbursement' ? `From the disbursement date, ${formatDate(app.disbursement?.date)}.` : 'From final approval. It is set again from the date OPS disburses the loan.'}
        </p>
        <div className="tablewrap">
          <Table size="small" aria-label="Repayment schedule">
            <TableHead>
              <TableRow>
                <TableCell>No.</TableCell>
                <TableCell>Due</TableCell>
                <TableCell align="right">Principal</TableCell>
                <TableCell align="right">Interest</TableCell>
                <TableCell align="right">Instalment</TableCell>
                <TableCell align="right">Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.n}>
                  <TableCell>{r.n}</TableCell>
                  <TableCell>{formatDate(r.due)}</TableCell>
                  <TableCell align="right" className="num">{formatNumber(r.principal)}</TableCell>
                  <TableCell align="right" className="num">{formatNumber(r.interest)}</TableCell>
                  <TableCell align="right" className="num">{formatNumber(r.payment)}</TableCell>
                  <TableCell align="right" className="num">{formatNumber(r.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {app.schedule.length > 6 && <Button variant="text" size="small" sx={{ mt: 1 }} onClick={() => setAll((v) => !v)}>{all ? 'Show the first 6' : `Show all ${app.schedule.length} instalments`}</Button>}
      </CardContent>
    </Card>
  );
}

function WithdrawDialog({ onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>Withdraw this application?</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <p style={{ margin: 0 }}>Your signed agreement becomes void. You can apply again later.</p>
        <TextField label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Keep it</Button>
        <Button variant="contained" onClick={() => onConfirm(reason)}>Withdraw</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ApplicationPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [app, setApp] = useState(null);
  const [error, setError] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    applicationsApi.get(id).then(setApp).catch((e) => setError(apiError(e).message));
  }, [id]);

  if (error && !app) return <div className="page"><Alert severity="error">{error}</Alert></div>;
  if (!app) return <p className="muted" role="status">Loading…</p>;
  const current = app.agreements.find((a) => a.status !== 'void') || app.agreements[0];
  const returned = [...app.history].reverse().find((h) => h.action === 'return');

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/applications" color="inherit">My applications</Link> / {app.ref}</div>
      <div className="pagehead">
        <div>
          <h1>{app.ref}</h1>
          <p>{app.product.name}, {formatTzs(app.approved?.amount || app.amount)} over {app.approved?.tenor || app.tenor} months <AppStatusChip status={app.status} /></p>
        </div>
        <div className="row">
          {app.status === 'returned' && <Button variant="contained" component={RouterLink} to={`/apply/${app.id}`}>Correct application</Button>}
          {app.withdrawable && app.status !== 'draft' && <Button onClick={() => setWithdrawing(true)}>Withdraw</Button>}
        </div>
      </div>
      <div className="stack">
        {params.get('submitted') && app.cycle > 0 && (
          <Alert severity="success">
            <AlertTitle>Submitted</AlertTitle>
            Your agreement {current?.number} is signed. It takes effect when the application gets final approval on these terms.
          </Alert>
        )}
        {app.status === 'pending_reaccept' && (
          <Alert severity="warning" action={<Button variant="contained" size="small" component={RouterLink} to={`/accept/${app.id}`}>Review revised terms</Button>}>
            <AlertTitle>Approved at revised terms</AlertTitle>
            {formatTzs(app.approved?.amount)} over {app.approved?.tenor} months. Read and accept the revised agreement so OPS can disburse.
          </Alert>
        )}
        {app.status === 'disbursed' && app.disbursement && (
          <Alert severity="success">
            <AlertTitle>Disbursed on {formatDate(app.disbursement.date)}</AlertTitle>
            {formatTzs(app.approved?.amount)} was paid out{app.disbursement.transactionRef ? ` (reference ${app.disbursement.transactionRef})` : ''}. Your first instalment of {formatTzs(app.schedule?.[0]?.payment)} is due on {formatDate(app.schedule?.[0]?.due)}.
          </Alert>
        )}
        {returned && app.status === 'returned' && (
          <Alert severity="warning">
            <AlertTitle>Returned for correction</AlertTitle>
            {returned.comment}
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <LoanRoute app={app} />
            {app.stageDueAt && app.currentStage && <p className="small muted" style={{ margin: '8px 0 0' }}>Target for this stage: {formatDateTime(app.stageDueAt)}.</p>}
          </CardContent>
        </Card>
        <div className={s.split}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <h3 style={{ marginBottom: 16 }}>History</h3>
              <ul className={s.tl}>
                {app.history.map((h, i) => {
                  const [label, tone] = ACTIONS[h.action] || [h.action, ''];
                  return (
                    // eslint-disable-next-line react/no-array-index-key
                    <li key={i}>
                      <span className={`${s.mk} ${tone ? s[tone] : ''}`} />
                      <div style={{ fontWeight: 600 }}>{label}</div>
                      <div className={s.when}>{formatDateTime(h.at)}</div>
                      {h.comment && <div className={s.cmt}>{h.comment}</div>}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          <div className="stack">
            <Card>
              <CardContent sx={{ p: 3 }}>
                <h3 style={{ marginBottom: 12 }}>Loan</h3>
                <dl className={s.kv}>
                  <dt>Amount</dt><dd>{formatTzs(app.amount)}</dd>
                  <dt>Tenor</dt><dd>{app.tenor} months</dd>
                  <dt>Instalment</dt><dd>{formatTzs(current?.terms?.instalment ?? app.quote.instalment)}</dd>
                  <dt>Purpose</dt><dd>{app.purpose}</dd>
                  <dt>Repayment</dt><dd>{app.repayment.method === 'payroll' ? 'Payroll deduction' : `Account ${app.repayment.accountNo}`}</dd>
                  <dt>Submitted</dt><dd>{formatDate(app.submittedAt)}</dd>
                </dl>
              </CardContent>
            </Card>
            {app.agreements.length > 0 && (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <h3 style={{ marginBottom: 12 }}>Agreement</h3>
                  {app.agreements.map((a) => (
                    <div key={a.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0' }}>
                      <span>
                        <Link component={RouterLink} to={`/agreement/${a.id}`}>{a.number}</Link>{' '}
                        <span className="small muted">{a.status === 'void' ? `void: ${a.voidReason}` : a.status === 'in_force' ? 'in force' : 'signed, awaiting approval'}</span>
                      </span>
                      <Button size="small" variant="text" onClick={() => downloadFile(`/agreements/${a.id}/pdf`, `${a.number}.pdf`).catch((e) => setError(apiError(e).message))}>PDF</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <h3 style={{ marginBottom: 12 }}>Documents</h3>
                {app.documents.length ? (
                  app.documents.map((d) => (
                    <div key={d.id}>
                      <Link component="button" type="button" onClick={() => downloadFile(`/files/${d.id}`, d.originalName).catch((e) => setError(apiError(e).message))}>{d.originalName}</Link>
                    </div>
                  ))
                ) : (
                  <span className="small muted">None attached</span>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {app.schedule && <Schedule app={app} />}
      </div>
      {withdrawing && (
        <WithdrawDialog
          onClose={() => setWithdrawing(false)}
          onConfirm={async (reason) => {
            try {
              setApp(await applicationsApi.withdraw(app.id, reason));
            } catch (e) {
              setError(apiError(e).message);
            }
            setWithdrawing(false);
          }}
        />
      )}
    </div>
  );
}
