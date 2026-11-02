// OPS disbursements (prototype #/disburse; FR-20 to FR-22, FR-26; Q3). Loans with
// final approval and an agreement in force are disbursed in core banking, then
// confirmed here with the date, an optional reference, a comment and the checklist.

import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField } from '@mui/material';
import { disbursementsApi } from '../../api/disbursements';
import { apiError } from '../../api/client';
import { formatDate, formatDateTime, formatNumber, formatTzs } from '../../lib/format';
import { todayEat } from '../../lib/dates';
import s from '../apply/apply.module.css';

const DEFAULT_COMMENT = 'Loan disbursed to staff account.';

function Summary({ d }) {
  const bank = d.creditTo;
  return (
    <dl className={s.kv}>
      <dt>Staff</dt><dd>{d.staff.name}, {d.staff.staffNo}</dd>
      <dt>Loan</dt><dd>{d.product}, {d.ref}</dd>
      {d.agreement && <><dt>Agreement</dt><dd>{d.agreement.number}, signed {formatDateTime(d.agreement.signedAt)}, in force from {formatDateTime(d.agreement.effectiveAt)}</dd></>}
      <dt>Amount</dt><dd>{formatTzs(d.amount)}</dd>
      <dt>Processing fee</dt><dd>{formatTzs(d.processingFee)}</dd>
      <dt>Insurance</dt><dd>{formatTzs(d.insuranceFee)}</dd>
      <dt>Credit to</dt><dd>{bank?.accountNo ? `${bank.bank || ''}, ${bank.accountNo}` : 'No bank account in the profile'}</dd>
      <dt>Instalment</dt><dd>{formatTzs(d.instalment)} for {d.tenor} months</dd>
      <dt>Recovery set-up</dt><dd>Salary deduction (HR and Finance)</dd>
      {d.topUp && <><dt>Top-up</dt><dd>Settle {d.topUp.loanRef} from this loan</dd></>}
    </dl>
  );
}

function ConfirmDialog({ id, onClose, onDone }) {
  const [d, setD] = useState(null);
  const [topUp, setTopUp] = useState(false);
  const [date, setDate] = useState(todayEat());
  const [ref, setRef] = useState('');
  const [comment, setComment] = useState(DEFAULT_COMMENT);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    disbursementsApi.get(id).then((x) => { setD(x); setDate(x.today); }).catch((e) => setError(apiError(e).message));
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    if (d.topUp && !topUp) return setError('Confirm the old loan balance has been settled.');
    if (!comment.trim()) return setError('Add a comment confirming the disbursement.');
    if (!date) return setError('Enter the disbursement date.');
    setBusy(true);
    setError(null);
    try {
      const res = await disbursementsApi.confirm(id, { date, transactionRef: ref.trim(), comment: comment.trim(), ...(d.topUp ? { topUpSettled: topUp } : {}) });
      onDone(res.message);
    } catch (err) {
      setError(apiError(err).message);
      setBusy(false);
    }
    return undefined;
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>
          Confirm disbursement
          <div className="small muted" style={{ fontWeight: 400, marginTop: 6 }}>Disburse in core banking first. This confirmation closes the loan&apos;s journey in Staff Loans.</div>
        </DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          {!d && !error && <p className="muted" role="status">Loading…</p>}
          {d && (
            <>
              <Summary d={d} />
              {d.blockedReason && <Alert severity="warning">{d.blockedReason}</Alert>}
              {d.topUp && (
                <div>
                  <h4 style={{ margin: '0 0 4px' }}>Before you confirm</h4>
                  <FormControlLabel sx={{ display: 'flex' }} control={<Checkbox checked={topUp} onChange={(e) => setTopUp(e.target.checked)} />} label={`Balance of ${d.topUp.loanRef} confirmed in core banking and settled`} />
                </div>
              )}
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <TextField label="Disbursement date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: d.earliestDate, max: d.today }} />
                <TextField label="Transaction reference" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Optional, e.g. FT26294AB12" inputProps={{ maxLength: 40 }} />
              </div>
              <TextField label="Comment" required multiline minRows={2} value={comment} onChange={(e) => setComment(e.target.value)} helperText="Required. Confirms the loan has been disbursed." />
            </>
          )}
          {error && <Alert severity="error" role="alert">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={!d || busy || !!d.blockedReason}>Confirm disbursement</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function ViewDialog({ id, onClose }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    disbursementsApi.get(id).then(setD).catch((e) => setError(apiError(e).message));
  }, [id]);
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{d ? `${d.ref} disbursed` : 'Disbursement'}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {d && (
          <>
            <Summary d={d} />
            <hr className="rule" style={{ width: '100%' }} />
            <dl className={s.kv}>
              <dt>Disbursed</dt><dd>{formatDate(d.disbursement.date)}</dd>
              <dt>Reference</dt><dd>{d.disbursement.transactionRef || '—'}</dd>
              <dt>Confirmed by</dt><dd>{d.disbursement.by}</dd>
              <dt>Comment</dt><dd>{d.disbursement.comment}</dd>
              <dt>First instalment</dt><dd>{formatDate(d.firstDueDate)}</dd>
            </dl>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {d?.agreement && <Button component={RouterLink} to={`/agreement/${d.agreement.id}`}>View agreement</Button>}
        <Button variant="contained" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function Waiting({ r }) {
  return (
    <>
      {formatDate(r.approvedAt)}
      <div className="xs muted">{r.daysWaiting === 0 ? 'Today' : `${r.daysWaiting} day${r.daysWaiting === 1 ? '' : 's'} ago`}</div>
      {r.outsideSla && <Chip size="small" color="warning" label="Outside SLA" sx={{ mt: 0.5 }} />}
    </>
  );
}

export default function DisbursementsPage() {
  const [tab, setTab] = useState('ready');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(() => {
    disbursementsApi.list(tab).then(setData).catch((e) => setError(apiError(e).message));
  }, [tab]);
  useEffect(load, [load]);

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>Disbursements</h1>
          <p>These loans have final approval and an agreement in force: the one signed at application, or a revised one the staff member accepted. Disburse each loan in core banking, then confirm it here. Confirming ends the loan&apos;s journey in Staff Loans.</p>
        </div>
        <Button onClick={() => disbursementsApi.exportRegister().catch((e) => setError(apiError(e).message))}>Export disbursed register</Button>
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {tab === 'ready' && data?.counts.outsideSla > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>{data.counts.outsideSla} {data.counts.outsideSla === 1 ? 'loan has' : 'loans have'} waited more than {data.slaDays} days</AlertTitle>
          They are outside the service level but do not expire. Disburse them or follow up with the staff member.
        </Alert>
      )}
      <Card>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setData(null); }} sx={{ px: 2 }} aria-label="Disbursements">
          <Tab value="ready" label={`Ready to disburse${data ? ` (${data.counts.ready})` : ''}`} />
          <Tab value="done" label={`Disbursed${data ? ` (${data.counts.done})` : ''}`} />
        </Tabs>
        {data && data.items.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <h3>{tab === 'ready' ? 'Nothing to disburse' : 'No disbursements yet'}</h3>
            <p className="muted">{tab === 'ready' ? 'Loans appear here once they have final approval.' : 'Confirmed disbursements appear here.'}</p>
          </div>
        ) : (
          <div className="tablewrap">
            <Table aria-label={tab === 'ready' ? 'Ready to disburse' : 'Disbursed'}>
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Staff</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Amount (TZS)</TableCell>
                  <TableCell align="right">Fees (TZS)</TableCell>
                  <TableCell align="right">Instalment</TableCell>
                  <TableCell>Repayment</TableCell>
                  <TableCell>{tab === 'ready' ? 'Approved' : 'Disbursed'}</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{r.ref}</TableCell>
                    <TableCell>{r.staff.name}<div className="xs muted">{r.staff.staffNo}, {r.staff.station}</div></TableCell>
                    <TableCell>{r.product}</TableCell>
                    <TableCell align="right" className="num">{formatNumber(r.amount)}</TableCell>
                    <TableCell align="right" className="num">{formatNumber(r.fees)}</TableCell>
                    <TableCell align="right" className="num">{formatNumber(r.instalment)}</TableCell>
                    <TableCell>Salary deduction</TableCell>
                    <TableCell>{tab === 'ready' ? <Waiting r={r} /> : <>{formatDate(r.disbursement.date)}{r.disbursement.transactionRef && <div className="xs muted">{r.disbursement.transactionRef}</div>}</>}</TableCell>
                    <TableCell align="right">
                      {tab === 'ready' ? (
                        r.blockedReason ? (
                          <span className="xs muted" style={{ display: 'inline-block', maxWidth: 200 }}>{r.blockedReason}</span>
                        ) : (
                          <Button size="small" variant="contained" onClick={() => setConfirming(r.id)}>Confirm disbursement</Button>
                        )
                      ) : (
                        <Button size="small" onClick={() => setViewing(r.id)}>View</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      {confirming && (
        <ConfirmDialog
          id={confirming}
          onClose={() => setConfirming(null)}
          onDone={(message) => {
            setConfirming(null);
            setToast(message);
            load();
          }}
        />
      )}
      {viewing && <ViewDialog id={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
