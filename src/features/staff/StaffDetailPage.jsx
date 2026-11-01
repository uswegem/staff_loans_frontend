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

const toForm = (d) => ({
  ...EMPTY_STAFF,
  ...Object.fromEntries(Object.entries(d).filter(([k]) => k in EMPTY_STAFF).map(([k, v]) => [k, v ?? ''])),
  stationHead: { name: d.stationHead?.name || '', phone: d.stationHead?.phone || '' },
  lineManagerStaffNo: d.lineManager?.staffNo || '',
});

function SalaryDialog({ onClose, onSave }) {
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
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>Record a salary change</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          <p className="small muted" style={{ margin: 0 }}>The old salary is kept as history. Applications use the salary in force on the day they are submitted (FR-03).</p>
          {error && <Alert severity="error">{error}</Alert>}
          <MoneyInput label="Basic salary" required value={v.basic} onChange={(x) => setV({ ...v, basic: x })} error={!!errors.basic} helperText={errors.basic?.join(' ')} />
          <MoneyInput label="Allowances" value={v.allowances} onChange={(x) => setV({ ...v, allowances: x })} helperText="Not counted for affordability." />
          <TextField label="Effective from" type="date" required value={v.effectiveFrom} onChange={(e) => setV({ ...v, effectiveFrom: e.target.value })} error={!!errors.effectiveFrom} helperText={errors.effectiveFrom?.join(' ')} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Save salary</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function StatusDialog({ current, onClose, onSave }) {
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
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>Change status</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {current !== 'active' && <MenuItem value="active">Active</MenuItem>}
            {current !== 'deactivated' && <MenuItem value="deactivated">Inactive</MenuItem>}
            {current !== 'exited' && <MenuItem value="exited">Exited (left LFB)</MenuItem>}
          </TextField>
          {status === 'exited' && <TextField label="Exit date" type="date" required value={exitDate} onChange={(e) => setExitDate(e.target.value)} />}
          <TextField label="Reason" multiline minRows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          {status !== 'active' && <Alert severity="warning">They are signed out at once and cannot sign in or apply. Their loan records stay visible to People and Culture and Finance (FR-04).</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Save status</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function NewStaffPage() {
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
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/staff" color="inherit">Staff records</Link></div>
      <div className="pagehead">
        <div>
          <h1>Add a staff member</h1>
          <p>They complete their personal, bank and next-of-kin details on their profile. A System Administrator adds their sign-in.</p>
        </div>
      </div>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <StaffForm values={values} onChange={setValues} errors={errors} isNew />
          <div className="row" style={{ marginTop: 24 }}>
            <Button variant="contained" onClick={save} disabled={busy}>Save staff record</Button>
            <Button component={RouterLink} to="/staff">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StaffDetailPage() {
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
  if (!d) return <p className="muted" role="status">Loading…</p>;
  const c = d.profile.completeness;

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/staff" color="inherit">Staff records</Link></div>
      <div className="pagehead">
        <div>
          <h1>{d.fullName}</h1>
          <p>
            {d.staffNo}, {d.title} {d.status !== 'active' && <Chip size="small" color={d.status === 'exited' ? 'error' : 'default'} label={d.status === 'exited' ? `Exited ${formatDate(d.exitDate)}` : 'Inactive'} />}
          </p>
        </div>
        {canManage && <Button onClick={() => setDialog('status')}>Change status</Button>}
      </div>
      <div className="stack">
        {toast && <Alert severity="success" onClose={() => setToast(null)}>{toast}</Alert>}
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {d.probation?.onProbation && (
          <Alert severity="info">
            <AlertTitle>On probation until {formatDate(d.probation.endsOn)}</AlertTitle>
            They may apply with a reason, which People and Culture verify during the review.
          </Alert>
        )}
        <div className={s.layout}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <StaffForm values={values} onChange={setValues} errors={errors} readOnly={!canManage} />
              {canManage && (
                <div className="row" style={{ marginTop: 24 }}>
                  <Button variant="contained" onClick={() => run(() => staffApi.update(id, toBody(values, { isNew: false })), 'Staff record saved.').catch(() => {})}>Save staff record</Button>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="stack">
            <StaffDobCard staffId={id} canManage={canManage} />
            <Card>
              <CardContent sx={{ p: 3 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <h3>Salary</h3>
                  {canManage && <Button size="small" onClick={() => setDialog('salary')}>Record a change</Button>}
                </div>
                <p className="small muted">In force: {d.salary ? `TZS ${formatNumber(d.salary.basic)} basic since ${formatDate(d.salary.effectiveFrom)}` : 'none'}</p>
                <div className="tablewrap">
                  <Table size="small" aria-label="Salary history">
                    <TableHead>
                      <TableRow>
                        <TableCell>From</TableCell>
                        <TableCell align="right">Basic</TableCell>
                        <TableCell align="right">Allowances</TableCell>
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
                <h3 style={{ marginBottom: 12 }}>Profile</h3>
                <Meter value={c.done} max={c.total} label={`${c.done} of ${c.total} required details`} />
                {!c.complete && <p className="small" style={{ marginTop: 12 }}>Missing: {c.missing.map((m) => m.label).join(', ')}.</p>}
                <dl className={s.kv} style={{ marginTop: 12 }}>
                  <dt>NIDA</dt><dd>{d.profile.personal?.nida || '—'}</dd>
                  <dt>Mobile</dt><dd>{d.profile.personal?.mobile || '—'}</dd>
                  <dt>Bank account</dt><dd>{d.profile.bank?.accountNo || '—'}</dd>
                  <dt>Sign-in</dt><dd>{d.signIn ? `${d.signIn.status}, last ${formatDateTime(d.signIn.lastLoginAt)}` : 'None yet'}</dd>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {dialog === 'salary' && <SalaryDialog onClose={() => setDialog(null)} onSave={(body) => run(() => staffApi.addSalary(id, body), 'Salary recorded.')} />}
      {dialog === 'status' && <StatusDialog current={d.status} onClose={() => setDialog(null)} onSave={(body) => run(() => staffApi.setStatus(id, body), 'Status saved.')} />}
    </div>
  );
}
