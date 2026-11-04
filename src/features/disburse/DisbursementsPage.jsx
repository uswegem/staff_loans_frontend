// OPS disbursements (prototype #/disburse; FR-20 to FR-22, FR-26; Q3). Loans with
// final approval and an agreement in force are disbursed in core banking, then
// confirmed here with the date, an optional reference, a comment and the checklist.

import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField } from '@mui/material';
import { disbursementsApi } from '../../api/disbursements';
import SuccessScreen from '../../components/ux/SuccessScreen';
import LoadingSkeleton from '../../components/ux/LoadingSkeleton';
import { apiError } from '../../api/client';
import { formatDate, formatDateTime, formatNumber, formatTzs } from '../../lib/format';
import { todayEat } from '../../lib/dates';
import s from '../apply/apply.module.css';
import { useT } from '../../i18n';

const DEFAULT_COMMENT = 'Loan disbursed to staff account.';


/** The loan a top-up settles (D-101): its Staff Loans reference, or the payslip deduction when it has none. */
const topUpName = (u) => [u.loanRef, u.payslipLine?.label && `${u.payslipLine.label} (${u.payslipLine.amount.toLocaleString('en-US')} a month)`].filter(Boolean).join(', ') || '—';
function Summary({ d }) {
  const t = useT();
  const bank = d.creditTo;
  return (
    <dl className={s.kv}>
      <dt>{t('Staff')}</dt><dd>{d.staff.name}, {d.staff.staffNo}</dd>
      <dt>{t('Loan')}</dt><dd>{d.product}, {d.ref}</dd>
      {d.agreement && <><dt>{t('Agreement')}</dt><dd>{t('{number}, signed {signed}, in force from {from}', { number: d.agreement.number, signed: formatDateTime(d.agreement.signedAt), from: formatDateTime(d.agreement.effectiveAt) })}</dd></>}
      <dt>{t('Amount')}</dt><dd>{formatTzs(d.amount)}</dd>
      <dt>{t('Processing fee')}</dt><dd>{formatTzs(d.processingFee)}</dd>
      <dt>{t('Insurance')}</dt><dd>{formatTzs(d.insuranceFee)}</dd>
      <dt>{t('Credit to')}</dt><dd>{bank?.accountNo ? `${bank.bank || ''}, ${bank.accountNo}` : t('No bank account in the profile')}</dd>
      <dt>{t('Instalment')}</dt><dd>{t('{amount} for {n} months', { amount: formatTzs(d.instalment), n: d.tenor })}</dd>
      <dt>{t('Recovery set-up')}</dt><dd>{t('Salary deduction (HR and Finance)')}</dd>
      {d.topUp && <><dt>{t('Top-up')}</dt><dd>{t('Settle {ref} from this loan', { ref: topUpName(d.topUp) })}</dd></>}
    </dl>
  );
}

function ConfirmDialog({ id, onClose, onDone }) {
  const t = useT();
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

  /** What still stops the confirmation, from the current entries (null when it can be sent). */
  const blocker = () => {
    if (d?.topUp && !topUp) return t('Confirm the old loan balance has been settled.');
    if (!comment.trim()) return t('Add a comment confirming the disbursement.');
    if (!date) return t('Enter the disbursement date.');
    return null;
  };
  const [tried, setTried] = useState(false);
  // Re-checked on every change once a submit was tried; the API's answer stays until the next submit.
  const problem = (tried && d && blocker()) || error;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return undefined;
    setTried(true);
    setError(null);
    if (blocker()) return undefined;
    setBusy(true);
    try {
      const res = await disbursementsApi.confirm(id, { date, transactionRef: ref.trim(), comment: comment.trim(), ...(d.topUp ? { topUpSettled: topUp } : {}) });
      onDone(res.message, { reference: d.ref, amount: d.amount, date, transactionRef: ref.trim() });
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
          {t('Confirm disbursement')}
          <div className="small muted" style={{ fontWeight: 400, marginTop: 6 }}>{t("Disburse in core banking first. This confirmation closes the loan's journey in Staff Loans.")}</div>
        </DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          {!d && !error && <p className="muted" role="status">{t('Loading…')}</p>}
          {d && (
            <>
              <Summary d={d} />
              {d.blockedReason && <Alert severity="warning">{d.blockedReason}</Alert>}
              {d.topUp && (
                <div>
                  <h4 style={{ margin: '0 0 4px' }}>{t('Before you confirm')}</h4>
                  <FormControlLabel sx={{ display: 'flex' }} control={<Checkbox checked={topUp} onChange={(e) => setTopUp(e.target.checked)} />} label={t('Balance of {ref} confirmed in core banking and settled', { ref: topUpName(d.topUp) })} />
                </div>
              )}
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <TextField label={t('Disbursement date')} type="date" required value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: d.earliestDate, max: d.today }} />
                <TextField label={t('Transaction reference')} value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t('Optional, e.g. FT26294AB12')} inputProps={{ maxLength: 40 }} />
              </div>
              <TextField label={t('Comment')} required multiline minRows={2} value={comment} onChange={(e) => setComment(e.target.value)} helperText={t('Required. Confirms the loan has been disbursed.')} />
            </>
          )}
          {problem && <Alert severity="error" role="alert">{problem}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={!d || busy || !!d.blockedReason}>{t('Confirm disbursement')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function ViewDialog({ id, onClose }) {
  const t = useT();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    disbursementsApi.get(id).then(setD).catch((e) => setError(apiError(e).message));
  }, [id]);
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{d ? t('{ref} disbursed', { ref: d.ref }) : t('Disbursement')}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {d && (
          <>
            <Summary d={d} />
            <hr className="rule" style={{ width: '100%' }} />
            <dl className={s.kv}>
              <dt>{t('Disbursed')}</dt><dd>{formatDate(d.disbursement.date)}</dd>
              <dt>{t('Reference')}</dt><dd>{d.disbursement.transactionRef || '—'}</dd>
              <dt>{t('Confirmed by')}</dt><dd>{d.disbursement.by}</dd>
              <dt>{t('Comment')}</dt><dd>{d.disbursement.comment}</dd>
              <dt>{t('First instalment')}</dt><dd>{formatDate(d.firstDueDate)}</dd>
            </dl>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {d?.agreement && <Button component={RouterLink} to={`/agreement/${d.agreement.id}`}>{t('View agreement')}</Button>}
        <Button variant="contained" onClick={onClose}>{t('Close')}</Button>
      </DialogActions>
    </Dialog>
  );
}

function Waiting({ r }) {
  const t = useT();
  return (
    <>
      {formatDate(r.approvedAt)}
      <div className="xs muted">{r.daysWaiting === 0 ? t('Today') : t(r.daysWaiting === 1 ? '{n} day ago' : '{n} days ago', { n: r.daysWaiting })}</div>
      {r.outsideSla && <Chip size="small" color="warning" label={t('Outside SLA')} sx={{ mt: 0.5 }} />}
    </>
  );
}

export default function DisbursementsPage() {
  const t = useT();
  const [tab, setTab] = useState('ready');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
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
          <h1>{t('Disbursements')}</h1>
          <p>{t("These loans have final approval and an agreement in force: the one signed at application, or a revised one the staff member accepted. Disburse each loan in core banking, then confirm it here. Confirming ends the loan's journey in Staff Loans.")}</p>
        </div>
        <Button onClick={() => disbursementsApi.exportRegister().catch((e) => setError(apiError(e).message))}>{t('Export disbursed register')}</Button>
      </div>
      {confirmed && (
        <SuccessScreen
          title={t('Disbursement confirmation recorded')}
          message={toast}
          details={[
            { label: t('Reference'), value: confirmed.reference },
            { label: t('Amount'), value: confirmed.amount != null ? formatNumber(confirmed.amount) + ' TZS' : '—' },
            { label: t('Disbursement date'), value: formatDate(confirmed.date) },
            ...(confirmed.transactionRef ? [{ label: t('Transaction reference'), value: confirmed.transactionRef }] : []),
          ]}
          primaryAction={{ label: t('Continue'), onClick: () => { setConfirmed(null); setToast(null); } }}
        />
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {tab === 'ready' && data?.counts.outsideSla > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>{t(data.counts.outsideSla === 1 ? '{n} loan has waited more than {days} days' : '{n} loans have waited more than {days} days', { n: data.counts.outsideSla, days: data.slaDays })}</AlertTitle>
          {t('They are outside the service level but do not expire. Disburse them or follow up with the staff member.')}
        </Alert>
      )}
      <Card>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setData(null); }} sx={{ px: 2 }} aria-label={t('Disbursements')}>
          <Tab value="ready" label={`${t('Ready to disburse')}${data ? ` (${data.counts.ready})` : ''}`} />
          <Tab value="done" label={`Disbursed${data ? ` (${data.counts.done})` : ''}`} />
        </Tabs>
        {!data && !error ? <div style={{ padding: 16 }}><LoadingSkeleton variant="table" rows={4} label={t('Loading…')} /></div> : data && data.items.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <h3>{tab === 'ready' ? t('Nothing to disburse') : t('No disbursements yet')}</h3>
            <p className="muted">{tab === 'ready' ? t('Loans appear here once they have final approval.') : t('Confirmed disbursements appear here.')}</p>
          </div>
        ) : (
          <div className="tablewrap">
            <Table aria-label={tab === 'ready' ? t('Ready to disburse') : t('Disbursed')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Reference')}</TableCell>
                  <TableCell>{t('Staff')}</TableCell>
                  <TableCell>{t('Product')}</TableCell>
                  <TableCell align="right">{t('Amount (TZS)')}</TableCell>
                  <TableCell align="right">{t('Fees (TZS)')}</TableCell>
                  <TableCell align="right">{t('Instalment')}</TableCell>
                  <TableCell>{t('Repayment')}</TableCell>
                  <TableCell>{tab === 'ready' ? t('Approved') : t('Disbursed')}</TableCell>
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
                    <TableCell>{t('Salary deduction')}</TableCell>
                    <TableCell>{tab === 'ready' ? <Waiting r={r} /> : <>{formatDate(r.disbursement.date)}{r.disbursement.transactionRef && <div className="xs muted">{r.disbursement.transactionRef}</div>}</>}</TableCell>
                    <TableCell align="right">
                      {tab === 'ready' ? (
                        r.blockedReason ? (
                          <span className="xs muted" style={{ display: 'inline-block', maxWidth: 200 }}>{r.blockedReason}</span>
                        ) : (
                          <Button size="small" variant="contained" onClick={() => setConfirming(r.id)}>{t('Confirm disbursement')}</Button>
                        )
                      ) : (
                        <Button size="small" onClick={() => setViewing(r.id)}>{t('View')}</Button>
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
          onDone={(message, summary) => {
            setConfirming(null);
            setToast(message);
            setConfirmed(summary);
            load();
          }}
        />
      )}
      {viewing && <ViewDialog id={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
