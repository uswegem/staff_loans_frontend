// One staff record (FR-01, FR-03, FR-04): employment details, salary history, status,
// and the staff member's profile completeness (read-only here).

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Link, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { staffApi } from '../../api/staff';
import { apiError } from '../../api/client';
import { formatDate, formatDateTime, formatNumber } from '../../lib/format';
import MoneyInput from '../../components/MoneyInput';
import Meter from '../../components/Meter';
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

function SalaryDialog({ onClose, onSave }) {
  const t = useT();
  const [v, setV] = useState({ basic: null, allowances: 0, effectiveFrom: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await onSave({ ...v, allowances: v.allowances || 0 });
    } catch (err) {
      const x = apiError(err);
      setErrors(x.details || {});
      setError(x.message);
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>{t('Record a salary change')}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          <p className="small muted" style={{ margin: 0 }}>{t('The old salary is kept as history. Applications use the salary in force on the day they are submitted (FR-03).')}</p>
          {error && <Alert severity="error">{error}</Alert>}
          <MoneyInput label={t('Basic salary')} required value={v.basic} onChange={(x) => setV({ ...v, basic: x })} error={!!errors.basic} helperText={errors.basic?.join(' ')} />
          <MoneyInput label={t('Allowances')} value={v.allowances} onChange={(x) => setV({ ...v, allowances: x })} helperText={t('Not counted for affordability.')} />
          <TextField label={t('Effective from')} type="date" required value={v.effectiveFrom} onChange={(e) => setV({ ...v, effectiveFrom: e.target.value })} error={!!errors.effectiveFrom} helperText={errors.effectiveFrom?.join(' ')} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained">{t('Save salary')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function StatusDialog({ current, onClose, onSave }) {
  const t = useT();
  const [status, setStatus] = useState(current === 'active' ? 'deactivated' : 'active');
  const [exitDate, setExitDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await onSave({ status, exitDate: status === 'exited' ? exitDate : undefined, reason });
    } catch (err) {
      setError(apiError(err).message);
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
          <Button type="submit" variant="contained">{t('Save status')}</Button>
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
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const created = await staffApi.create(toBody({ ...values, staffNo: values.staffNo.trim().toUpperCase() }, { isNew: true }));
      navigate(`/staff/${created.id}`, { replace: true });
    } catch (err) {
      const x = apiError(err);
      setErrors(x.details || {});
      setError(x.message);
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
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);

  const show = (data) => {
    setD(data);
    setValues(toForm(data));
  };
  useEffect(() => {
    staffApi.get(id).then(show).catch((err) => setError(apiError(err).message));
  }, [id]);

  const run = async (fn, message) => {
    setError(null);
    setToast(null);
    try {
      show(await fn());
      setErrors({});
      setDialog(null);
      setToast(message);
    } catch (err) {
      const x = apiError(err);
      setErrors(x.details || {});
      setError(x.message);
      throw err;
    }
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
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
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
                  <Button variant="contained" onClick={() => run(() => staffApi.update(id, toBody(values, { isNew: false })), t('Staff record saved.')).catch(() => {})}>{t('Save staff record')}</Button>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="stack">
            <StaffDobCard staffId={id} canManage={canManage} />
            <Card>
              <CardContent sx={{ p: 3 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <h3>{t('Salary')}</h3>
                  {canManage && <Button size="small" onClick={() => setDialog('salary')}>{t('Record a change')}</Button>}
                </div>
                <p className="small muted">{t('In force:')} {d.salary ? t('TZS {amount} basic since {date}', { amount: formatNumber(d.salary.basic), date: formatDate(d.salary.effectiveFrom) }) : t('none')}</p>
                <div className="tablewrap">
                  <Table size="small" aria-label={t('Salary history')}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('From')}</TableCell>
                        <TableCell align="right">{t('Basic')}</TableCell>
                        <TableCell align="right">{t('Allowances')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {d.salaries.map((x) => (
                        <TableRow key={x.id}>
                          <TableCell>{formatDate(x.effectiveFrom)}</TableCell>
                          <TableCell align="right" className="num">{formatNumber(x.basic)}</TableCell>
                          <TableCell align="right" className="num">{formatNumber(x.allowances)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
      {dialog === 'salary' && <SalaryDialog onClose={() => setDialog(null)} onSave={(body) => run(() => staffApi.addSalary(id, body), t('Salary recorded.'))} />}
      {dialog === 'status' && <StatusDialog current={d.status} onClose={() => setDialog(null)} onSave={(body) => run(() => staffApi.setStatus(id, body), t('Status saved.'))} />}
    </div>
  );
}
