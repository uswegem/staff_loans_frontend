// A product or pricing version through maker-checker (BRD 5.1, FR-58 to FR-63).
// The maker edits and submits; a different user, the checker, sees the full version
// with the comparison and approves, or rejects with a reason. The API enforces who
// may do what; the buttons only reflect it.

import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Link, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { versionsApi } from '../../../api/products';
import { apiError } from '../../../api/client';
import { formatDate, formatDateTime } from '../../../lib/format';
import { todayEat } from '../../../lib/dates';
import StateChip from '../../../components/StateChip';
import ProductForm from './ProductForm';
import PricingForm from './PricingForm';
import { formatCompareValue } from './compareFormat';
import s from './products.module.css';
import { useT } from '../../../i18n';

function Comparison({ comparison }) {
  const t = useT();
  const { changes, liveVersion, scheduledVersion } = comparison;
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <h3 style={{ marginBottom: 4 }}>{t('What changes')}</h3>
        <p className="small muted">
          {liveVersion ? t('Compared with version {n}, in force since {date}.', { n: liveVersion.version, date: formatDate(liveVersion.liveFrom) }) : t('Nothing is live yet: every value is new.')}
          {scheduledVersion ? ` ${t('Version {n} is scheduled for {date}.', { n: scheduledVersion.version, date: formatDate(scheduledVersion.liveFrom) })}` : ''}
        </p>
        {changes.length === 0 ? (
          <p className="small" style={{ margin: 0 }}>{t('No values differ from the live version.')}</p>
        ) : (
          <div className="tablewrap">
            <Table size="small" aria-label={t('Changes against the live version')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Value')}</TableCell>
                  <TableCell>{t('Live')}</TableCell>
                  <TableCell>{t('Proposed')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {changes.map((c) => (
                  <TableRow key={c.field} className={s.changed}>
                    <TableCell sx={{ fontWeight: 600 }}>{c.label}</TableCell>
                    <TableCell className="small" sx={{ textDecoration: 'line-through', color: 'var(--ink-3)' }}>{formatCompareValue(c.field, c.before)}</TableCell>
                    <TableCell className="small">{formatCompareValue(c.field, c.after)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RejectDialog({ onClose, onReject }) {
  const t = useT();
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 5) return setError(t('Give a reason the maker can act on.'));
    try {
      await onReject(reason.trim());
    } catch (err) {
      setError(apiError(err).message);
    }
    return undefined;
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{t('Reject and return to the maker')}</DialogTitle>
        <DialogContent>
          <TextField label={t('Reason')} required multiline minRows={3} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} error={!!error} helperText={error || t('The maker sees this and can correct the draft.')} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained">{t('Reject')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

const CHANGE_TYPE = { create: 'New product', change: 'Change', deactivate: 'Deactivation' };

export default function VersionPage({ kind }) {
  const t = useT();
  const { vid } = useParams();
  const navigate = useNavigate();
  const vapi = versionsApi(kind);
  const [v, setV] = useState(null);
  const [values, setValues] = useState(null);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const show = useCallback((data) => {
    setV(data);
    setValues(data.values);
    setEffectiveFrom(data.effectiveFrom);
    setNote(data.note || '');
  }, []);

  useEffect(() => {
    vapi.get(vid).then(show).catch((err) => setError(apiError(err).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vid]);

  const act = async (fn, done) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await fn();
      if (data) show(data);
      setErrors({});
      if (done) setMessage(done);
      return data;
    } catch (err) {
      const x = apiError(err);
      setErrors(x.details || {});
      setError(x.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const save = () => act(() => vapi.update(vid, { ...(v.changeType === 'deactivate' ? {} : { values }), effectiveFrom, note }), t('Draft saved. Check what changes, then submit it for approval.'));
  const submit = async () => {
    const saved = await act(() => vapi.update(vid, { ...(v.changeType === 'deactivate' ? {} : { values }), effectiveFrom, note }));
    if (saved) await act(() => vapi.submit(vid), t('Submitted. Checkers have been notified.'));
  };

  if (error && !v) return <div className="page"><Alert severity="error">{error}</Alert></div>;
  if (!v) return <p className="muted" role="status">{t('Loading…')}</p>;

  const title = kind === 'pricing' ? t('Pricing version {n}', { n: v.version }) : t('{name} version {n}', { name: v.values.name, n: v.version });
  const back = kind === 'pricing' ? '/admin/products' : `/admin/products/${v.product.id}`;
  const readOnly = !v.canEdit || v.changeType === 'deactivate';

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}>
        <Link component={RouterLink} to="/admin/products" color="inherit">{t('Products and pricing')}</Link>
        {kind === 'product' && <> / <Link component={RouterLink} to={back} color="inherit">{v.product.code}</Link></>}
      </div>
      <div className="pagehead">
        <div>
          <h1>{title}</h1>
          <p>
            {t(CHANGE_TYPE[v.changeType] || 'Change')} <StateChip state={v.state} />
          </p>
        </div>
      </div>

      <div className="stack">
        {message && <Alert severity="success" onClose={() => setMessage(null)}>{message}</Alert>}
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {v.rejectionReason && ['draft', 'rejected'].includes(v.state) && (
          <Alert severity="warning">
            <AlertTitle>{t('Rejected by {name}', { name: v.checker?.name })}</AlertTitle>
            {v.rejectionReason} {t('It is back in draft: edit it and submit it again, or discard it.')}
          </Alert>
        )}
        {v.state === 'pending_approval' && <Alert severity="info">{t('Waiting for the {stage}.', { stage: t(v.stageLabel || 'approver') })}{v.isEditor ? ` ${t('You prepared or edited this change, so someone else must approve it.')}` : ''} {t('Approval order: Head of Credit, then Head of Risk and Compliance.')}</Alert>}
        {v.state === 'approved_scheduled' && <Alert severity="info">{t('Approved. It goes live on {date}; the current version stays in force until then.', { date: formatDate(v.liveFrom) })}</Alert>}
        {v.changeType === 'deactivate' && ['draft', 'rejected', 'pending_approval'].includes(v.state) && (
          <Alert severity="warning">{t('From the effective date this product is hidden from new applications. Applications already in progress continue.')}</Alert>
        )}

        <Card>
          <dl className={s.headerCard} style={{ margin: 0 }}>
            <div><dt>{t('Effective from')}</dt><dd>{formatDate(v.effectiveFrom)}</dd></div>
            <div><dt>{t('Live from')}</dt><dd>{v.liveFrom ? formatDateTime(v.liveFrom) : '—'}</dd></div>
            <div><dt>{t('Maker')}</dt><dd>{v.maker?.name || '—'}</dd></div>
            <div><dt>{t('Submitted')}</dt><dd>{v.submittedAt ? formatDateTime(v.submittedAt) : '—'}</dd></div>
            <div><dt>{t('Approvals')}</dt><dd>{(v.approvals || []).length ? v.approvals.map((a) => `${a.stageLabel} ${formatDateTime(a.at)}`).join('; ') : '—'}</dd></div>
            <div><dt>{t('Final approver')}</dt><dd>{v.checker?.name || '—'}</dd></div>
            <div><dt>{t('Decided')}</dt><dd>{v.decidedAt ? formatDateTime(v.decidedAt) : '—'}</dd></div>
          </dl>
          {v.note && <p className="small" style={{ padding: '0 24px 16px', margin: 0 }}><b>{t('Why:')}</b> {v.note}</p>}
        </Card>

        <div className={s.layout}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              {kind === 'pricing' ? <PricingForm values={values} onChange={setValues} errors={errors} readOnly={readOnly} /> : <ProductForm values={values} onChange={setValues} errors={errors} readOnly={readOnly} />}
            </CardContent>
          </Card>
          <div className={`${s.sticky} stack`}>
            <Comparison comparison={v.comparison} />
            {(v.canEdit || v.canRecall || v.canCheck) && (
              <Card>
                <CardContent sx={{ p: 3, display: 'grid', gap: 2 }}>
                  {v.canEdit && (
                    <>
                      <TextField label={t('Effective from')} type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} inputProps={{ min: todayEat() }} error={!!errors.effectiveFrom} helperText={errors.effectiveFrom?.join(' ')} />
                      <TextField label={t('Why this change')} multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                      <Button onClick={save} disabled={busy}>{t('Save draft')}</Button>
                      <Button variant="contained" onClick={submit} disabled={busy}>{t('Submit for approval')}</Button>
                      <Button variant="text" onClick={() => act(() => vapi.discard(vid)).then((d) => d && navigate(back))} disabled={busy}>{t('Discard draft')}</Button>
                    </>
                  )}
                  {v.canRecall && <Button onClick={() => act(() => vapi.recall(vid), t('Taken back to draft.'))} disabled={busy}>{t('Take back to draft')}</Button>}
                  {v.canCheck && (
                    <>
                      <p className="small" style={{ margin: 0 }}>{t('Check every value and the comparison.')} {v.stage === 'credit' ? t('Your approval sends it to the Head of Risk and Compliance.') : t('Your approval publishes it on the effective date.')}</p>
                      <Button variant="contained" onClick={() => act(() => vapi.approve(vid), t('Approved.'))} disabled={busy}>{t('Approve')}</Button>
                      <Button onClick={() => setRejecting(true)} disabled={busy}>{t('Reject')}</Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      {rejecting && (
        <RejectDialog
          onClose={() => setRejecting(false)}
          onReject={async (reason) => {
            const data = await vapi.reject(vid, reason);
            show(data);
            setRejecting(false);
            setMessage(t('Rejected and returned to the maker.'));
          }}
        />
      )}
    </div>
  );
}
