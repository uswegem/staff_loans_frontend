// One staff record (FR-01, FR-04): employment details, the worked-out probation end and
// retirement dates (D-100), status,
// and the staff member's profile completeness (read-only here).

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Link, MenuItem, TextField } from '@mui/material';
import { staffApi } from '../../api/staff';
import { apiError } from '../../api/client';
import { formatDate, formatDateTime } from '../../lib/format';
import Meter from '../../components/Meter';
import { failureShown, useServerErrors } from '../../lib/validation';
import StaffForm, { EMPTY_STAFF, toBody } from './StaffForm';
import StaffDobCard from './StaffDobCard';
import s from './staff.module.css';
import { useT } from '../../i18n';

const toForm = (d) => ({
  ...EMPTY_STAFF,
  ...Object.fromEntries(Object.entries(d).filter(([k]) => k in EMPTY_STAFF).map(([k, v]) => [k, v ?? ''])),
  stationHead: { name: d.stationHead?.name || '', phone: d.stationHead?.phone || '' },
  lineManagerStaffNo: d.lineManager?.staffNo || '',
});

function StatusDialog({ current, onClose, onSave }) {
  const t = useT();
  const [status, setStatus] = useState(current === 'active' ? 'deactivated' : 'active');
  const [exitDate, setExitDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onSave({ status, exitDate: status === 'exited' ? exitDate : undefined, reason });
    } catch (err) {
      setError(apiError(err).message);
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{t('Change status')}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField select label={t('Status')} value={status} onChange={(e) => setStatus(e.target.value)}>
            {current !== 'active' && <MenuItem value="active">{t('Active')}</MenuItem>}
            {current !== 'deactivated' && <MenuItem value="deactivated">{t('Inactive')}</MenuItem>}
            {current !== 'exited' && <MenuItem value="exited">{t('Exited (left LFB)')}</MenuItem>}
          </TextField>
          {status === 'exited' && <TextField label={t('Exit date')} type="date" required value={exitDate} onChange={(e) => setExitDate(e.target.value)} />}
          <TextField label={t('Reason')} multiline minRows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          {status !== 'active' && <Alert severity="warning">{t('They are signed out at once and cannot sign in or apply. Their loan records stay visible to People and Culture and Finance (FR-04).')}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy}>{t('Save status')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function NewStaffPage() {
  const t = useT();
  const navigate = useNavigate();
  const [values, setValues] = useState(EMPTY_STAFF);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const server = useServerErrors(errors, values);
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const created = await staffApi.create(toBody({ ...values, staffNo: values.staffNo.trim().toUpperCase() }, { isNew: true }));
      navigate(`/staff/${created.id}`, { replace: true });
    } catch (err) {
      const x = apiError(err);
      setErrors(x.details || {});
      setFailure(x);
      setBusy(false);
    }
  };
  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/staff" color="inherit">{t('Staff records')}</Link></div>
      <div className="pagehead">
        <div>
          <h1>{t('Add a staff member')}</h1>
          <p>{t('They complete their personal, bank and next-of-kin details on their profile. A System Administrator adds their sign-in.')}</p>
        </div>
      </div>
      {failureShown(failure, errors, server) && <Alert severity="error" sx={{ mb: 2 }}>{failure.message}</Alert>}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <StaffForm values={values} onChange={setValues} errors={errors} isNew />
          <div className="row" style={{ marginTop: 24 }}>
            <Button variant="contained" onClick={save} disabled={busy}>{t('Save staff record')}</Button>
            <Button component={RouterLink} to="/staff">{t('Cancel')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StaffDetailPage() {
  const t = useT();
  const { id } = useParams();
  const canManage = useSelector((st) => st.auth.permissions.includes('staff.manage'));
  const [d, setD] = useState(null);
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const server = useServerErrors(errors, values);

  const show = (data) => {
    setD(data);
    setValues(toForm(data));
  };
  useEffect(() => {
    staffApi.get(id).then(show).catch((err) => setError(apiError(err).message));
  }, [id]);

  /** Saves; a dialog shows its own failure, the staff record form shows the page's. */
  const run = async (fn, message, { inDialog = false } = {}) => {
    if (!inDialog) setFailure(null);
    setToast(null);
    try {
      show(await fn());
      setErrors({});
      setDialog(null);
      setToast(message);
    } catch (err) {
      if (!inDialog) {
        const x = apiError(err);
        setErrors(x.details || {});
        setFailure(x);
      }
      throw err;
    }
  };
  const saveRecord = async () => {
    if (busy) return;
    setBusy(true);
    await run(() => staffApi.update(id, toBody(values, { isNew: false })), t('Staff record saved.')).catch(() => {});
    setBusy(false);
  };

  if (error && !d) return <div className="page"><Alert severity="error">{error}</Alert></div>;
  if (!d) return <p className="muted" role="status">{t('Loading…')}</p>;
  const c = d.profile.completeness;

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/staff" color="inherit">{t('Staff records')}</Link></div>
      <div className="pagehead">
        <div>
          <h1>{d.fullName}</h1>
          <p>
            {d.staffNo}, {d.title} {d.status !== 'active' && <Chip size="small" color={d.status === 'exited' ? 'error' : 'default'} label={d.status === 'exited' ? t('Exited {date}', { date: formatDate(d.exitDate) }) : t('Inactive')} />}
          </p>
        </div>
        {canManage && <Button onClick={() => setDialog('status')}>{t('Change status')}</Button>}
      </div>
      <div className="stack">
        {toast && <Alert severity="success" onClose={() => setToast(null)}>{toast}</Alert>}
        {failureShown(failure, errors, server) && <Alert severity="error" onClose={() => setFailure(null)}>{failure.message}</Alert>}
        {d.probation?.onProbation && (
          <Alert severity="info">
            <AlertTitle>{t('On probation until {date}', { date: formatDate(d.probation.endsOn) })}</AlertTitle>
            {t('They may apply with a reason, which People and Culture verify during the review.')}
          </Alert>
        )}
        <div className={s.layout}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <StaffForm values={values} onChange={setValues} errors={errors} readOnly={!canManage} />
              {canManage && (
                <div className="row" style={{ marginTop: 24 }}>
                  <Button variant="contained" onClick={saveRecord} disabled={busy}>{t('Save staff record')}</Button>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="stack">
            <StaffDobCard staffId={id} canManage={canManage} />
            <Card>
              <CardContent sx={{ p: 3 }}>
                <h3 style={{ marginBottom: 4 }}>{t('Worked out')}</h3>
                <p className="xs muted" style={{ margin: '0 0 12px' }}>{t('Not entered: worked out from the settings, so they cannot be edited here.')}</p>
                <dl className={s.kv}>
                  <dt>{t('Probation ends')}</dt>
                  <dd>
                    {d.probation?.endsOn ? <>{formatDate(d.probation.endsOn)} <span className="small muted">({d.probation.onProbation ? t('on probation') : t('completed')})</span></> : t('Needs the date joined')}
                    <div className="xs muted" style={{ fontWeight: 400 }}>{t('Date joined + {n} months', { n: d.probation?.months ?? 6 })}</div>
                  </dd>
                  <dt>{t('Retirement date')}</dt>
                  <dd>
                    {d.retirement?.date ? formatDate(d.retirement.date) : t('Not available: no verified date of birth')}
                    <div className="xs muted" style={{ fontWeight: 400 }}>{t('Verified date of birth + {n} years', { n: d.retirement?.age ?? 60 })}</div>
                  </dd>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <h3 style={{ marginBottom: 12 }}>{t('Profile')}</h3>
                <Meter value={c.done} max={c.total} label={t('{done} of {total} required details', { done: c.done, total: c.total })} />
                {!c.complete && <p className="small" style={{ marginTop: 12 }}>Missing: {c.missing.map((m) => m.label).join(', ')}.</p>}
                <dl className={s.kv} style={{ marginTop: 12 }}>
                  <dt>{t('NIDA')}</dt><dd>{d.profile.personal?.nida || '—'}</dd>
                  <dt>{t('Mobile')}</dt><dd>{d.profile.personal?.mobile || '—'}</dd>
                  <dt>{t('Bank account')}</dt><dd>{d.profile.bank?.accountNo || '—'}</dd>
                  <dt>{t('Sign-in')}</dt><dd>{d.signIn ? t('{status}, last {when}', { status: t(d.signIn.status), when: formatDateTime(d.signIn.lastLoginAt) }) : t('None yet')}</dd>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {dialog === 'status' && <StatusDialog current={d.status} onClose={() => setDialog(null)} onSave={(body) => run(() => staffApi.setStatus(id, body), t('Status saved.'), { inDialog: true })} />}
    </div>
  );
}
