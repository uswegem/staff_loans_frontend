// The Disbursement queue (prototype #/disburse; FR-20 to FR-22, FR-26; Q3; D-112).
// After final approval a loan waits here for OPS or People and Culture (disb.confirm). They
// book it in the loan management system outside SLAS, download the Agreement and the Loan
// Summary, and mark it as disbursed. Nobody marks their own loan, or one they approved (the
// API gives the reason). The applicant never sees the papers here. A booking recorded
// before D-112 is still shown, read-only.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, SvgIcon, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Tooltip, useMediaQuery } from '@mui/material';
import { disbursementsApi } from '../../api/disbursements';
import SupportingDocuments from '../../components/SupportingDocuments';
import SuccessScreen from '../../components/ux/SuccessScreen';
import LoadingSkeleton from '../../components/ux/LoadingSkeleton';
import { apiError } from '../../api/client';
import { formatDate, formatDateTime, formatNumber, formatTzs } from '../../lib/format';
import { todayEat } from '../../lib/dates';
import s from '../apply/apply.module.css';
import { useT } from '../../i18n';
import DateField from '../../components/fields/DateField';
import ScheduleDownload from '../../components/ScheduleDownload';

const COMMENT_MIN = 5;
const COMMENT_MAX = 1000;

const AgreementIcon = (props) => <SvgIcon {...props}><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></SvgIcon>;
const SummaryIcon = (props) => <SvgIcon {...props}><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" /></SvgIcon>;

/**
 * D-112: the Agreement and the Loan Summary PDFs, next to each other; icons with labels on a
 * phone. Hidden on the person's own loan (the API refuses it too).
 */
export function LoanPapers({ item, onError, size = 'small' }) {
  const t = useT();
  const phone = useMediaQuery('(max-width:600px)');
  if (!item || !item.canDownload) return null;
  const agreementId = item.agreementId || item.agreement?.id;
  const number = item.agreementNumber || item.agreement?.number;
  const fail = (e) => onError?.(apiError(e).message);
  const papers = [
    agreementId && { key: 'agreement', label: t('Agreement'), aria: t('Download the agreement for {ref}', { ref: item.ref }), Icon: AgreementIcon, go: () => disbursementsApi.agreementPdf(agreementId, number).catch(fail) },
    { key: 'summary', label: t('Loan summary'), aria: t('Download the loan summary for {ref}', { ref: item.ref }), Icon: SummaryIcon, go: () => disbursementsApi.summaryPdf(item.id, item.ref).catch(fail) },
  ].filter(Boolean);
  return (
    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      {papers.map((p) => (phone
        ? <Tooltip key={p.key} title={p.label}><IconButton size={size} aria-label={p.aria} onClick={p.go}><p.Icon fontSize="small" /></IconButton></Tooltip>
        : <Button key={p.key} size={size} variant="outlined" startIcon={<p.Icon fontSize="small" />} aria-label={p.aria} onClick={p.go}>{p.label}</Button>))}
    </span>
  );
}


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

function ConfirmDisbursementDialog({ id, onClose, onDone }) {
  const t = useT();
  const [d, setD] = useState(null);
  const [topUp, setTopUp] = useState(false);
  const [date, setDate] = useState(todayEat());
  const [ref, setRef] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    disbursementsApi.get(id).then((x) => { setD(x); setDate(x.today); }).catch((e) => setError(apiError(e).message));
  }, [id]);

  /** What still stops the confirmation, from the current entries (null when it can be sent). */
  const blocker = () => {
    if (d?.topUp && !topUp) return t('Confirm the old loan balance has been settled.');
    if (!date) return t('Enter the disbursement date.');
    if (d && date > d.today) return t('The disbursement date cannot be in the future.');
    if (d && date < d.earliestDate) return t('The disbursement date cannot be before the final approval.');
    if (!ref.trim()) return t('Enter the core banking transaction reference.');
    if (comment.trim().length < COMMENT_MIN) return t('Add a comment for the disbursement record.');
    if (comment.trim().length > COMMENT_MAX) return t('The comment can be at most {n} characters.', { n: COMMENT_MAX });
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
      onDone(res.message, { reference: d.ref, amount: d.amount, date, transactionRef: ref.trim(), comment: comment.trim() });
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
          {t('Mark as disbursed')}
          <div className="small muted" style={{ fontWeight: 400, marginTop: 6 }}>{t("Disburse in core banking first. Marking it as disbursed closes the loan's journey in Staff Loans.")}</div>
        </DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          {!d && !error && <p className="muted" role="status">{t('Loading…')}</p>}
          {d && (
            <>
              <Summary d={d} />
              {d.booking && <><h4 style={{ margin: 0 }}>{t('Booking')}</h4><Booking b={d.booking} /></>}
              <h4>{t('Supporting documents')}</h4>
              <SupportingDocuments documents={d.documents} documentChecklist={d.documentChecklist} />
              {d.blockedReason && <Alert severity="warning">{d.blockedReason}</Alert>}
              <LoanPapers item={d} onError={setError} />
              {d.topUp && (
                <div>
                  <h4 style={{ margin: '0 0 4px' }}>{t('Before you confirm')}</h4>
                  <FormControlLabel sx={{ display: 'flex' }} control={<Checkbox checked={topUp} onChange={(e) => setTopUp(e.target.checked)} />} label={t('Balance of {ref} confirmed in core banking and settled', { ref: topUpName(d.topUp) })} />
                </div>
              )}
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <DateField label={t('Disbursement date')} required value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: d.earliestDate, max: d.today }} />
                <TextField label={t('Transaction reference')} required value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t('e.g. FT26294AB12')} inputProps={{ maxLength: 40 }} />
              </div>
              <TextField label={t('Comment')} required multiline minRows={2} value={comment} onChange={(e) => setComment(e.target.value)} inputProps={{ maxLength: COMMENT_MAX }} helperText={t('Required, {min} to {max} characters. Kept with the disbursement record.', { min: COMMENT_MIN, max: COMMENT_MAX })} />
            </>
          )}
          {problem && <Alert severity="error" role="alert">{problem}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={!d || busy || !!d.blockedReason}>{t('Mark as disbursed')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function Booking({ b }) {
  const t = useT();
  return (
    <dl className={s.kv}>
      <dt>{t('Loan account')}</dt><dd>{b.loanAccountNumber}</dd>
      <dt>{t('Booked')}</dt><dd>{t('{date}, by {name}', { date: formatDate(b.date), name: b.by || '—' })}</dd>
      {b.note && <><dt>{t('Booking note')}</dt><dd>{b.note}</dd></>}
    </dl>
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
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{d ? (d.disbursement ? t('{ref} disbursed', { ref: d.ref }) : d.ref) : t('Disbursement')}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {d && (
          <>
            <LoanPapers item={d} onError={setError} />
            <Summary d={d} />
            <h4>{t('Supporting documents')}</h4>
            <SupportingDocuments documents={d.documents} documentChecklist={d.documentChecklist} />
            {d.booking && <><hr className="rule" style={{ width: '100%' }} /><Booking b={d.booking} /></>}
            {d.disbursement && <hr className="rule" style={{ width: '100%' }} />}
            {d.disbursement && <dl className={s.kv}>
              <dt>{t('Disbursement date')}</dt><dd>{formatDate(d.disbursement.date)}</dd>
              <dt>{t('Transaction reference')}</dt><dd>{d.disbursement.transactionRef || '—'}</dd>
              <dt>{t('Comment')}</dt><dd>{d.disbursement.comment || '—'}</dd>
              <dt>{t('Confirmed by')}</dt><dd>{d.disbursement.by || '—'}</dd>
              <dt>{t('First instalment')}</dt><dd>{formatDate(d.firstDueDate)}</dd>
            </dl>}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {d && <ScheduleDownload id={d.id} reference={d.ref} status={d.status} onError={setError} />}
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

/** What this person can do on a row: mark it as disbursed, or a read-only view with the reason. */
function RowAction({ r, tab, onConfirm, onView }) {
  const t = useT();
  const note = (text) => <><span className="xs muted" style={{ display: 'inline-block', maxWidth: 200, marginRight: 8 }}>{text}</span><Button size="small" onClick={onView}>{t('View')}</Button></>;
  if (tab === 'ready') {
    if (r.canConfirm) return <Button size="small" variant="contained" onClick={onConfirm}>{t('Mark as disbursed')}</Button>;
    return note(r.blockedReason || t('Waiting for another officer to mark it as disbursed.'));
  }
  return <Button size="small" onClick={onView}>{t('View')}</Button>;
}

export default function DisbursementsPage() {
  const t = useT();
  // null until the API answers (it opens Ready to disburse).
  const [tab, setTab] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [viewing, setViewing] = useState(null);

  // Only the answer for the tab now chosen is shown: a slower answer for an earlier tab is dropped.
  const asked = useRef(0);
  const load = useCallback(() => {
    asked.current += 1;
    const mine = asked.current;
    disbursementsApi.list(tab || undefined).then((x) => {
      if (mine !== asked.current) return;
      setData(x);
      setTab((cur) => cur || x.tab);
    }).catch((e) => setError(apiError(e).message));
  }, [tab]);
  const shown = tab || data?.tab;
  useEffect(load, [load]);

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('Disbursement')}</h1>
          <p>{t('Loans with final approval. People and Culture or OPS download the papers and mark each loan as disbursed once the money is paid out.')}</p>
        </div>
        <Button onClick={() => disbursementsApi.exportRegister().catch((e) => setError(apiError(e).message))}>{t('Export disbursed register')}</Button>
      </div>
      {confirmed && (
        <SuccessScreen
          title={t('Marked as disbursed')}
          message={toast}
          details={[
            { label: t('Reference'), value: confirmed.reference },
            { label: t('Amount'), value: confirmed.amount != null ? formatNumber(confirmed.amount) + ' TZS' : '—' },
            { label: t('Disbursement date'), value: formatDate(confirmed.date) },
            ...(confirmed.transactionRef ? [{ label: t('Transaction reference'), value: confirmed.transactionRef }] : []),
            ...(confirmed.comment ? [{ label: t('Comment'), value: confirmed.comment }] : []),
          ]}
          primaryAction={{ label: t('Continue'), onClick: () => { setConfirmed(null); setToast(null); } }}
        />
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {toast && !confirmed && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {shown !== 'done' && data?.counts.outsideSla > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>{t(data.counts.outsideSla === 1 ? '{n} loan has waited more than {days} days' : '{n} loans have waited more than {days} days', { n: data.counts.outsideSla, days: data.slaDays })}</AlertTitle>
          {t('They are outside the service level but do not expire. Disburse them or follow up with the staff member.')}
        </Alert>
      )}
      <Card>
        <Tabs value={shown || false} onChange={(_, v) => { setTab(v); setData(null); }} sx={{ px: 2 }} aria-label={t('Disbursement')}>
          <Tab value="ready" label={`${t('Ready to disburse')}${data ? ` (${data.counts.ready})` : ''}`} />
          <Tab value="done" label={`${t('Disbursed')}${data ? ` (${data.counts.done})` : ''}`} />
        </Tabs>
        {!data && !error ? <div style={{ padding: 16 }}><LoadingSkeleton variant="table" rows={4} label={t('Loading…')} /></div> : data && data.items.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <h3>{shown === 'ready' ? t('Nothing to disburse') : t('No disbursements yet')}</h3>
            <p className="muted">{shown === 'ready' ? t('Loans appear here once they have final approval.') : t('Loans marked as disbursed appear here.')}</p>
          </div>
        ) : (
          <div className="tablewrap">
            <Table aria-label={shown === 'ready' ? t('Ready to disburse') : t('Disbursed')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Reference')}</TableCell>
                  <TableCell>{t('Staff')}</TableCell>
                  <TableCell>{t('Product')}</TableCell>
                  <TableCell align="right">{t('Amount (TZS)')}</TableCell>
                  <TableCell align="right">{t('Fees (TZS)')}</TableCell>
                  <TableCell align="right">{t('Instalment')}</TableCell>
                  <TableCell>{t('Repayment')}</TableCell>
                  <TableCell>{shown === 'done' ? t('Disbursed') : t('Approved')}</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{r.ref}</TableCell>
                    <TableCell>{r.staff.name}<div className="xs muted">{r.staff.staffNo}, {r.staff.station}</div></TableCell>
                    <TableCell>{r.product}</TableCell>
                    <TableCell align="right" className="num">{formatNumber(r.amount)}</TableCell>
                    <TableCell align="right" className="num">{formatNumber(r.fees)}</TableCell>
                    <TableCell align="right" className="num">{formatNumber(r.instalment)}</TableCell>
                    <TableCell>{t('Salary deduction')}</TableCell>
                    <TableCell>{shown !== 'done' ? <><Waiting r={r} />{r.booking && <div className="xs muted">{t('Loan account {n}', { n: r.booking.loanAccountNumber })}</div>}</> : <>{formatDate(r.disbursement.date)}{r.disbursement.transactionRef && <div className="xs muted">{r.disbursement.transactionRef}</div>}{r.disbursement.comment && <div className="xs muted" style={{ maxWidth: 220 }}>{r.disbursement.comment}</div>}{r.disbursement.by && <div className="xs muted">{t('by {name}', { name: r.disbursement.by })}</div>}</>}</TableCell>
                    <TableCell align="right">
                      <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <LoanPapers item={r} onError={setError} />
                        <RowAction r={r} tab={shown} onConfirm={() => setConfirming(r.id)} onView={() => setViewing(r.id)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      {confirming && (
        <ConfirmDisbursementDialog
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
