// Workflow and calendar (prototype #/admin/workflow; BRD 7.3, Q3). The four routes
// are fixed by the BRD and shown read-only; targets, working time, the reapply and
// SLA periods and public holidays are editable and audited.

import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { settingsApi } from '../../../api/reports';
import { apiError } from '../../../api/client';
import { formatDate } from '../../../lib/format';
import s from '../../apply/apply.module.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const NUMBERS = [
  ['stageTargetHours', 'Each review stage (working hours)'],
  ['ceoTargetHours', 'CEO (working hours)'],
  ['revisedTermsExpiryDays', 'Revised terms must be accepted within (days)'],
  ['approvalSlaDays', 'Outside SLA after (days pending disbursement)'],
  ['probationMonths', 'Probation (months after joining)'],
  ['firstDueDay', 'First instalment day of the month'],
  ['payslipMaxAgeDays', 'Payslip must not be older than (days)'],
  ['retirementAge', 'Retirement age (years)'],
  ['retirementBufferDays', 'Last instalment at least this many days before it'],
  ['dobMinAge', 'Youngest age a date of birth may give'],
  ['dobMaxAge', 'Oldest age a date of birth may give'],
  ['maxUploadMb', 'Largest upload (MB)'],
  ['inactivityTimeoutMin', 'Sign out after inactivity (minutes)'],
  ['lockoutThreshold', 'Lock after failed sign-ins'],
];

function EditDialog({ settings, onClose, onSaved }) {
  const [form, setForm] = useState({ ...settings, start: hhmm(settings.dayStartMinutes), end: hhmm(settings.dayEndMinutes) });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const save = async (e) => {
    e.preventDefault();
    const body = { workingDays: form.workingDays, dayStartMinutes: toMin(form.start), dayEndMinutes: toMin(form.end) };
    NUMBERS.forEach(([k]) => { body[k] = Number(form[k]); });
    try {
      onSaved(await settingsApi.update(body));
    } catch (err) {
      const x = apiError(err);
      setError(x.message);
      setFieldErrors(x.details || {});
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={save} noValidate>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>Targets and working time</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', pt: '8px !important' }}>
          {NUMBERS.map(([k, label]) => (
            <TextField key={k} type="number" label={label} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} error={!!fieldErrors[k]} helperText={fieldErrors[k]?.[0]} inputProps={{ min: 0 }} />
          ))}
          <TextField type="time" label="Day starts" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField type="time" label="Day ends" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} InputLabelProps={{ shrink: true }} error={!!fieldErrors.dayEndMinutes} helperText={fieldErrors.dayEndMinutes?.[0]} />
          <fieldset style={{ border: 0, padding: 0, margin: 0, gridColumn: '1 / -1' }}>
            <legend className="small" style={{ fontWeight: 600, marginBottom: 4 }}>Working days</legend>
            {DAYS.map((d, i) => (
              <FormControlLabel
                key={d}
                label={d}
                control={<Checkbox checked={form.workingDays.includes(i)} onChange={(e) => setForm({ ...form, workingDays: e.target.checked ? [...form.workingDays, i].sort() : form.workingDays.filter((x) => x !== i) })} />}
              />
            ))}
          </fieldset>
          {error && <Alert severity="error" role="alert" sx={{ gridColumn: '1 / -1' }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

const RULES = [
  ['basicLabels', 'Basic Pay', 'Words before the Basic Pay amount'],
  ['lfbLabels', 'LFB deductions', 'Every line with one of these words is an LFB deduction; the amounts are added up'],
  ['dateLabels', 'Pay date', 'Words before the pay date or pay month'],
];

/** The labels the payslip reader looks for (D-79): one per line, first match wins. */
function PayslipRulesCard({ rules, onSaved, onError }) {
  const [form, setForm] = useState(() => Object.fromEntries(RULES.map(([k]) => [k, rules[k].join('\n')])));
  const save = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(RULES.map(([k]) => [k, form[k].split('\n').map((x) => x.trim()).filter(Boolean)]));
    try {
      await settingsApi.update({ payslipRules: body });
      onSaved('Payslip labels saved. They apply to payslips attached from now on.');
    } catch (err) {
      onError(apiError(err).message);
    }
  };
  return (
    <Card sx={{ mt: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <h3 style={{ marginBottom: 4 }}>Reading payslips</h3>
        <p className="small muted" style={{ marginTop: 0 }}>Basic Pay, LFB deductions and the pay date are read from the payslip PDF staff attach. If Payroll changes the payslip layout, change the words here. One per line.</p>
        <form onSubmit={save} style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {RULES.map(([k, label, hint]) => (
            <TextField key={k} label={label} multiline minRows={4} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} helperText={hint} />
          ))}
          <div style={{ gridColumn: '1 / -1' }}><Button type="submit" variant="contained">Save payslip labels</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function WorkflowPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(false);
  const [holiday, setHoliday] = useState({ date: '', name: '' });

  const load = () => settingsApi.get().then(setData).catch((e) => setError(apiError(e).message));
  useEffect(() => {
    load();
  }, []);

  const addHoliday = async (e) => {
    e.preventDefault();
    try {
      await settingsApi.addHoliday(holiday);
      setHoliday({ date: '', name: '' });
      setError(null);
      load();
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  if (!data) return <div className="page">{error ? <Alert severity="error">{error}</Alert> : <p className="muted" role="status">Loading…</p>}</div>;
  const st = data.settings;
  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>Workflow and calendar</h1>
          <p>Four approval routes, fixed by the BRD. Turnaround targets count working hours on this calendar.</p>
        </div>
      </div>
      {toast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>{toast}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <div className={s.split}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <h3 style={{ marginBottom: 8 }}>Approval routes</h3>
            <p className="small" style={{ marginTop: 0 }}>The route comes from the applicant&apos;s role and the category on their staff record. After the last approval, OPS disburses. Staff sign the agreement when applying and accept a revised agreement only if the approved terms differ.</p>
            <div className="tablewrap">
              <Table size="small" aria-label="Approval routes">
                <TableHead>
                  <TableRow><TableCell>Applicant</TableCell><TableCell>Route</TableCell><TableCell>Credit Analyst sees</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {data.routes.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell sx={{ fontWeight: 600 }}>{r.label}</TableCell>
                      <TableCell>{[...r.stages, 'OPS'].join(' → ')}</TableCell>
                      <TableCell>{r.limitedCredit ? <Chip size="small" color="warning" label="Name, mobile, NIDA only" /> : 'Full application'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>Management: CEO and Heads of Operations, Credit, People and Culture, Finance, Risk, Legal, Audit and Business. The CEO&apos;s own application ends with the Head of People and Culture; the Head of People and Culture&apos;s goes to the People and Culture Manager, then the CEO. Every reviewer can approve, return or reject. No amount thresholds.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>Targets and working time</h3>
              <Button size="small" onClick={() => setEditing(true)}>Edit</Button>
            </div>
            <dl className={s.kv} style={{ marginTop: 12 }}>
              <dt>Each review stage</dt><dd>{st.stageTargetHours} working hours</dd>
              <dt>CEO</dt><dd>{st.ceoTargetHours} working hours</dd>
              <dt>Working days</dt><dd>{st.workingDays.map((d) => DAYS[d]).join(', ')}</dd>
              <dt>Working hours</dt><dd>{hhmm(st.dayStartMinutes)} to {hhmm(st.dayEndMinutes)}</dd>
              <dt>Revised terms must be accepted within</dt><dd>{st.revisedTermsExpiryDays} days</dd>
              <dt>Outside SLA after</dt><dd>{st.approvalSlaDays} days pending disbursement (no expiry)</dd>
              <dt>Probation</dt><dd>{st.probationMonths} months after joining</dd>
              <dt>First instalment</dt><dd>Day {st.firstDueDay} of the month after</dd>
              <dt>Payslip</dt><dd>Not older than {st.payslipMaxAgeDays} days at submission</dd>
              <dt>Retirement cutoff</dt><dd>Last instalment by {st.retirementBufferDays} days before age {st.retirementAge} (verified date of birth)</dd>
              <dt>Date of birth</dt><dd>Age {st.dobMinAge} to {st.dobMaxAge} when entered; verified by People and Culture</dd>
            </dl>
            <h4 style={{ margin: '20px 0 8px' }}>Public holidays</h4>
            <Table size="small" aria-label="Public holidays">
              <TableBody>
                {data.holidays.length === 0 && <TableRow><TableCell className="muted">No holidays added.</TableCell></TableRow>}
                {data.holidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{formatDate(h.date)}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell align="right">
                      <Button size="small" color="error" onClick={() => settingsApi.removeHoliday(h.id).then(load).catch((e) => setError(apiError(e).message))} aria-label={`Remove ${h.name}`}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <form onSubmit={addHoliday} className="row" style={{ marginTop: 12 }}>
              <TextField size="small" type="date" label="Holiday date" value={holiday.date} onChange={(e) => setHoliday({ ...holiday, date: e.target.value })} InputLabelProps={{ shrink: true }} required />
              <TextField size="small" label="Holiday name" value={holiday.name} onChange={(e) => setHoliday({ ...holiday, name: e.target.value })} required />
              <Button type="submit" size="small" disabled={!holiday.date || holiday.name.trim().length < 2}>Add holiday</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <PayslipRulesCard key={st.version} rules={st.payslipRules} onSaved={(m) => { setToast(m); setError(null); load(); }} onError={setError} />
      {editing && (
        <EditDialog
          settings={st}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setToast('Saved. New targets apply to stages entered from now on.');
            load();
          }}
        />
      )}
    </div>
  );
}
