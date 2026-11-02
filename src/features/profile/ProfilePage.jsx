// My profile (prototype #/profile; BRD 6, decision 7, FR-05). Five tabs; staff complete
// every required detail once and each application fills in from here. Employment and
// salary are read-only: People and Culture maintain them.

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, AlertTitle, Button, Card, CardContent, IconButton, MenuItem, Tab, Tabs, TextField } from '@mui/material';
import { dobApi, profileApi } from '../../api/staff';
import { productsApi } from '../../api/products';
import { apiError } from '../../api/client';
import { formatDate, formatTzs } from '../../lib/format';
import DobStatus from '../../components/DobStatus';
import MoneyInput from '../../components/MoneyInput';
import Meter from '../../components/Meter';
import s from './profile.module.css';

const TABS = [
  ['personal', 'Personal details'],
  ['employment', 'Employment'],
  ['bank', 'Bank details'],
  ['kin', 'Next of kin'],
  ['pay', 'Pay and staff loans'],
];

/** Form state initialised once; the page remounts a tab (new key) after each save. */
function useForm(initial) {
  const [v, setV] = useState(initial);
  return [v, (k) => (e) => setV((x) => ({ ...x, [k]: e?.target ? e.target.value : e }))];
}

function Field({ label, value, onChange, error, required, helperText, ...rest }) {
  return <TextField {...rest} label={label} value={value ?? ''} onChange={onChange} required={required} error={!!error} helperText={error || helperText} />;
}

function PersonalTab({ profile, missing, onSave }) {
  const p = profile.personal || {};
  const dob = profile.dateOfBirth || {};
  const myId = useSelector((st) => st.auth.user?.id);
  // D-82: the field starts from the proposed date while one waits, so saving other details does not resend it.
  const [v, on] = useForm({ maritalStatus: p.maritalStatus || '', dob: dob.pending?.proposed || dob.verified || '', nida: p.nida || '', nationality: p.nationality || '', mobile: p.mobile || '', workPhone: profile.workPhone || '', poBox: p.poBox || '', residence: p.residence || '' });
  const err = (k) => (missing.has(`personal.${k}`) ? 'Required to apply.' : undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(() => profileApi.savePersonal({ ...v, dob: v.dob || null })); }} noValidate>
      <div className={s.grid}>
        <Field label="First Name" value={profile.firstName} disabled helperText="From your staff record. Ask People and Culture to correct it." />
        <Field label="Surname" value={profile.lastName} disabled />
        <Field select label="Marital status" required value={v.maritalStatus} onChange={on('maritalStatus')} error={err('maritalStatus')}>
          {['Single', 'Married', 'Divorced', 'Widowed'].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </Field>
        <Field
          label="Date of birth"
          type="date"
          required
          value={v.dob}
          onChange={on('dob')}
          error={profile.errors?.dob || err('dob')}
          disabled={!!dob.pending}
          InputLabelProps={{ shrink: true }}
          helperText={dob.pending ? 'Waiting for People and Culture. Withdraw it below to change it.' : 'A new date is checked by People and Culture before it is used for loans.'}
        />
        <div className={s.full}>
          <DobStatus status={dob} canWithdraw={!!dob.pending && dob.pending.submittedById === myId} onWithdraw={() => onSave(() => dobApi.withdraw(dob.pending.id).then(() => profileApi.get()))} />
        </div>
        <Field label="NIDA number" required value={v.nida} onChange={on('nida')} error={profile.errors?.nida || err('nida')} helperText="20 digits as on your national ID card, for example 19890712-14112-00004-21" inputProps={{ inputMode: 'numeric' }} />
        <Field label="Nationality" required value={v.nationality} onChange={on('nationality')} error={err('nationality')} />
        <Field label="Mobile phone" type="tel" required value={v.mobile} onChange={on('mobile')} error={profile.errors?.mobile || err('mobile')} />
        <Field label="Work phone" type="tel" value={v.workPhone} onChange={on('workPhone')} error={profile.errors?.workPhone} />
        <Field label="P.O. Box" required value={v.poBox} onChange={on('poBox')} error={err('poBox')} />
        <Field label="Residence (village or street)" required value={v.residence} onChange={on('residence')} error={err('residence')} className={s.full} />
      </div>
      <div className="row" style={{ marginTop: 24 }}><Button type="submit" variant="contained">Save personal details</Button></div>
    </form>
  );
}

function EmploymentTab({ profile, roles, permissions, mfaRequired }) {
  const e = profile.employment;
  return (
    <>
      <Alert severity="info">
        <AlertTitle>People and Culture maintains these details</AlertTitle>
        If something is wrong, ask them to correct your staff record. Your category decides your approval route.
      </Alert>
      <dl className={s.kv}>
        <dt>Staff number</dt><dd>{profile.staffNo}</dd>
        <dt>Job title</dt><dd>{e.title}</dd>
        <dt>Department</dt><dd>{e.department || '—'}</dd>
        <dt>Work station</dt><dd>{e.station}</dd>
        {e.stationHead?.name && (<><dt>Head of station</dt><dd>{e.stationHead.name}{e.stationHead.phone ? `, ${e.stationHead.phone}` : ''}</dd></>)}
        <dt>Employment type</dt><dd>{e.employmentType}{e.probation?.onProbation ? `, on probation until ${formatDate(e.probation.endsOn)}` : ''}</dd>
        <dt>Category</dt><dd>{e.category}</dd>
        <dt>Date joined</dt><dd>{formatDate(e.dateJoined)}</dd>
        {e.contractEndDate && (<><dt>Contract ends</dt><dd>{formatDate(e.contractEndDate)}</dd></>)}
        <dt>Retirement date</dt><dd>{formatDate(e.retirementDate)}</dd>
        <dt>Approval route</dt><dd>{profile.route.description}</dd>
        {profile.route.limitedCredit && (<><dt>Credit Analyst sees</dt><dd>Only your name, mobile number and NIDA number</dd></>)}
      </dl>
      <h4 style={{ marginTop: 24 }}>Your access in Staff Loans</h4>
      <p className="small muted">Roles are assigned by a system administrator.</p>
      <dl className={s.kv}>
        <dt>Roles</dt><dd>{roles.map((r) => r.name).join(', ')}</dd>
        <dt>Permissions</dt><dd>{permissions.length}</dd>
        <dt>Sign-in check</dt><dd>{mfaRequired ? 'Password and one-time code (MFA)' : 'Password'}</dd>
      </dl>
    </>
  );
}

function BankTab({ profile, missing, onSave }) {
  const b = profile.bank || {};
  const [v, on] = useForm({ bank: b.bank || '', branch: b.branch || '', accountName: b.accountName || '', accountNo: b.accountNo || '' });
  const err = (k) => (missing.has(`bank.${k}`) ? 'Required to apply.' : undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(() => profileApi.saveBank(v)); }} noValidate>
      <p className="small muted">Used when you choose to repay by account debit. Your LFB account is filled in for you.</p>
      <div className={s.grid}>
        <Field label="Bank" required value={v.bank} onChange={on('bank')} error={err('bank')} />
        <Field label="Branch" required value={v.branch} onChange={on('branch')} error={err('branch')} />
        <Field label="Account name" required value={v.accountName} onChange={on('accountName')} error={err('accountName')} />
        <Field label="Account number" required value={v.accountNo} onChange={on('accountNo')} error={err('accountNo')} />
      </div>
      <div className="row" style={{ marginTop: 24 }}><Button type="submit" variant="contained">Save bank details</Button></div>
    </form>
  );
}

function KinTab({ profile, missing, onSave }) {
  const k = profile.nextOfKin?.[0] || {};
  const [v, on] = useForm({ firstName: k.firstName || '', lastName: k.lastName || '', relationship: k.relationship || '', phone: k.phone || '', employer: k.employer || '', address: k.address || '' });
  const err = (f) => (missing.has(`nextOfKin.0.${f}`) ? 'Required to apply.' : undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(() => profileApi.saveKin([v, ...(profile.nextOfKin || []).slice(1)])); }} noValidate>
      <p className="small muted">At least one next of kin is required.</p>
      <div className={s.grid}>
        <Field label="First Name" required value={v.firstName} onChange={on('firstName')} error={err('firstName')} />
        <Field label="Surname" required value={v.lastName} onChange={on('lastName')} error={err('lastName')} />
        <Field select label="Relationship" required value={v.relationship} onChange={on('relationship')} error={err('relationship')}>
          {['Spouse', 'Parent', 'Child', 'Sibling', 'Other relative', 'Guardian'].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </Field>
        <Field label="Phone" type="tel" required value={v.phone} onChange={on('phone')} error={profile.errors?.['nextOfKin.0.phone'] || err('phone')} />
        <Field label="Employer" value={v.employer} onChange={on('employer')} />
        <Field label="Residential address" required value={v.address} onChange={on('address')} error={err('address')} className={s.full} />
      </div>
      <div className="row" style={{ marginTop: 24 }}><Button type="submit" variant="contained">Save next of kin</Button></div>
    </form>
  );
}

/**
 * Existing staff loans taken outside Staff Loans (decision 19). They count towards the
 * running loans per product (BR-07) and start the reapply wait (NS-02). The limit itself
 * is worked out from the payslip attached to each application (D-78, D-80).
 */
function PayTab({ profile, onSave }) {
  const [lfb, setLfb] = useState(profile.existingLfbLoans || []);
  const [products, setProducts] = useState([]);
  useEffect(() => {
    productsApi.live().then(setProducts).catch(() => setProducts([]));
  }, []);
  const setL = (i, patch) => setLfb(lfb.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const submit = (e) => {
    e.preventDefault();
    return onSave(() =>
      profileApi.savePay({
        existingLfbLoans: lfb.map((l) => ({ description: l.description || '', instalment: l.instalment ?? null, productId: l.productId || null, disbursedOn: l.disbursedOn || null })),
      })
    );
  };

  return (
    <form onSubmit={submit} noValidate>
      <h4>Your pay</h4>
      <p className="small muted">When you apply, you attach your latest payslip. Your limit is worked out from its Basic Pay and LFB deductions: pension (10%) and PAYE come off Basic Pay, LFB deductions are added back, and you can borrow up to half of that a month.</p>
      <dl className={s.kv}>
        <dt>Basic salary on record</dt><dd>{formatTzs(profile.salary?.basic)} <span className="small muted">(People and Culture check it against your payslip)</span></dd>
      </dl>

      <h4 style={{ marginTop: 24 }}>Existing LFB staff loans from before Staff Loans</h4>
      <p className="small muted">Loans taken on paper are not in this system. If you know the product and the date it was paid out, add them; they count towards the loans you may have per product, and you can apply for the same product again six months after that date.</p>
      {lfb.map((l, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className={s.loanRow4}>
          <TextField label="Loan" value={l.description || ''} onChange={(e) => setL(i, { description: e.target.value })} placeholder="Staff loan (paper)" />
          <TextField select label="Product (optional)" value={l.productId || ''} onChange={(e) => setL(i, { productId: e.target.value || null })}>
            <MenuItem value="">Not sure</MenuItem>
            {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
          <TextField label="Paid out on (optional)" type="date" value={l.disbursedOn || ''} onChange={(e) => setL(i, { disbursedOn: e.target.value || null })} InputLabelProps={{ shrink: true }} />
          <MoneyInput label="Monthly instalment" value={l.instalment} onChange={(v) => setL(i, { instalment: v })} />
          <IconButton aria-label={`Remove staff loan ${i + 1}`} onClick={() => setLfb(lfb.filter((_, j) => j !== i))}>×</IconButton>
        </div>
      ))}
      <Button size="small" onClick={() => setLfb([...lfb, { description: 'Staff loan (paper)', instalment: null }])}>Add a staff loan</Button>
      <div className="row" style={{ marginTop: 16 }}><Button type="submit" variant="contained">Save existing staff loans</Button></div>
    </form>
  );
}

export default function ProfilePage() {
  const { roles, permissions, mfaRequired } = useSelector((st) => st.auth);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('personal');
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [version, setVersion] = useState(0);

  useEffect(() => {
    profileApi.get().then(setProfile).catch((e) => setError(apiError(e).message));
  }, []);

  if (error && !profile) return <div className="page"><Alert severity="error">{error}</Alert></div>;
  if (!profile) return <p className="muted" role="status">Loading…</p>;

  const c = profile.completeness;
  const missing = new Set(c.missing.map((m) => m.key));
  const missIn = (t) => c.missing.filter((m) => m.tab === t).length;

  /** Saves a tab; on success moves to the next tab with missing details (prototype). */
  const save = async (fn) => {
    setToast(null);
    setError(null);
    setFieldErrors({});
    try {
      const next = await fn();
      setProfile(next);
      setVersion((n) => n + 1);
      const order = TABS.map((t) => t[0]);
      const nextMissing = order.find((t) => next.completeness.missing.some((m) => m.tab === t));
      setToast(next.completeness.complete ? 'Profile complete. You can now apply for a loan.' : 'Saved.');
      if (nextMissing) setTab(nextMissing);
    } catch (err) {
      const x = apiError(err);
      setFieldErrors(Object.fromEntries(Object.entries(x.details || {}).map(([k, v]) => [k, v.join(' ')])));
      setError(x.message);
    }
  };

  const shown = { ...profile, errors: fieldErrors };

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>My profile</h1>
          <p>Complete every required detail once. Each application fills in from here.</p>
        </div>
        <div style={{ minWidth: 240 }}>
          <Meter value={c.done} max={c.total} label={`${c.done} of ${c.total} required details`} />
        </div>
      </div>
      <div className="stack">
        {!c.complete && (
          <Alert severity="warning">
            <AlertTitle>You can apply once your profile is complete</AlertTitle>
            Missing: {c.missing.map((m) => m.label).join(', ')}.
          </Alert>
        )}
        {toast && <Alert severity="success" onClose={() => setToast(null)}>{toast}</Alert>}
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 3 }} aria-label="Profile sections">
              {TABS.map(([k, l]) => (
                <Tab key={k} value={k} label={<span>{l}{missIn(k) ? <span className={s.count}>{missIn(k)}</span> : null}</span>} />
              ))}
            </Tabs>
            {tab === 'personal' && <PersonalTab key={`personal${version}`} profile={shown} missing={missing} onSave={save} />}
            {tab === 'employment' && <EmploymentTab profile={profile} roles={roles} permissions={permissions} mfaRequired={mfaRequired} />}
            {tab === 'bank' && <BankTab key={`bank${version}`} profile={shown} missing={missing} onSave={save} />}
            {tab === 'kin' && <KinTab key={`kin${version}`} profile={shown} missing={missing} onSave={save} />}
            {tab === 'pay' && <PayTab key={`pay${version}`} profile={shown} onSave={save} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
