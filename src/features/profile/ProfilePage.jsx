// My profile (prototype #/profile; BRD 6, decision 7, FR-05). Five tabs; staff complete
// every required detail once and each application fills in from here. Employment is
// read-only: People and Culture maintain it. Pay comes from the payslip on each application (D-100).
//
// Validation (D-93): each field's border and message follow its current value as the
// person types (src/lib/validation.js), not the last saved state. The completeness count
// and the Missing list come from the server and update on save.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, CardContent, IconButton, MenuItem, Tab, Tabs, TextField } from '@mui/material';
import { dobApi, profileApi } from '../../api/staff';
import { productsApi } from '../../api/products';
import { apiError } from '../../api/client';
import { formatDate } from '../../lib/format';
import { RULES, checkValue, useValidatedForm } from '../../lib/validation';
import { countryOf } from '../../lib/formats';
import { useT } from '../../i18n';
import DobStatus from '../../components/DobStatus';
import ApplyBlockers from '../../components/ApplyBlockers';
import MoneyInput from '../../components/MoneyInput';
import Meter from '../../components/Meter';
import ActionFeedback from '../../components/ux/ActionFeedback';
import LoadingSkeleton from '../../components/ux/LoadingSkeleton';
import PhoneField from '../../components/fields/PhoneField';
import NidaField from '../../components/fields/NidaField';
import CountryField from '../../components/fields/CountryField';
import AddressFields from '../../components/fields/AddressFields';
import s from './profile.module.css';

const TABS = [
  ['personal', 'Personal details'],
  ['employment', 'Employment'],
  ['bank', 'Bank details'],
  ['kin', 'Next of kin'],
  ['pay', 'Pay and staff loans'],
];

const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed'];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Other relative', 'Guardian'];
const REQUIRED = 'Required to apply.';
const ADDRESS_REQUIRED = ['region', 'district', 'ward', 'street'];

/** The rule for a profile field: required when the settings require it, plus its format. */
const ruleFor = (required, validate) => ({ required, requiredMessage: REQUIRED, validate });

/** Server field errors ({ field: [messages] }) as { field: message }. */
const flat = (errors) => Object.fromEntries(Object.entries(errors || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : v]));

/** Calls onFixed once the last field the API flagged has been changed. */
function useFixed(left, onFixed) {
  const prev = useRef(left);
  useEffect(() => {
    if (prev.current > 0 && left === 0) onFixed?.();
    prev.current = left;
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
}

function PersonalTab({ profile, requiredKeys, onSave, onFixed }) {
  const t = useT();
  const p = profile.personal || {};
  const dob = profile.dateOfBirth || {};
  const myId = useSelector((st) => st.auth.user?.id);
  const req = (k) => requiredKeys.has(`personal.${k}`);
  const rules = useMemo(
    () => ({
      maritalStatus: ruleFor(req('maritalStatus')),
      dob: ruleFor(req('dob')),
      nida: ruleFor(req('nida'), RULES.nida),
      nationality: ruleFor(req('nationality')),
      mobile: ruleFor(req('mobile'), RULES.phone),
      workPhone: ruleFor(false, RULES.phone),
    }),
    [requiredKeys] // eslint-disable-line react-hooks/exhaustive-deps
  );
  // D-82: the field starts from the proposed date while one waits, so saving other details does not resend it.
  const form = useValidatedForm(
    {
      maritalStatus: p.maritalStatus || '',
      dob: dob.pending?.proposed || dob.verified || '',
      nida: p.nida || '',
      nationality: countryOf(p.nationality) || 'Tanzania',
      mobile: p.mobile || '',
      workPhone: profile.workPhone || '',
      address: { region: '', district: '', ward: '', street: '', house: '', ...(p.address || {}) },
    },
    rules
  );
  const { values: v, set, touch, errorOf } = form;
  useFixed(form.serverLeft, onFixed);
  useEffect(() => form.setServerErrors(flat(profile.errors)), [profile.errors]); // eslint-disable-line react-hooks/exhaustive-deps

  const msg = (k) => {
    const m = errorOf(k);
    return m ? t(m) : undefined;
  };
  const addressError = (part) => {
    const server = profile.errors?.[`address.${part}`];
    if (server && (form.values.address?.[part] || '') === (p.address?.[part] || '')) return t(flat({ x: server }).x);
    if (!form.shown('address')) return undefined;
    const m = checkValue(v.address?.[part], ruleFor(req(`address.${part}`) && ADDRESS_REQUIRED.includes(part)));
    return m ? t(m) : undefined;
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.attempt(); onSave(() => profileApi.savePersonal({ ...v, dob: v.dob || null })); }} noValidate>
      <div className={s.grid}>
        <TextField label={t('First Name')} value={profile.firstName || ''} disabled helperText={t('From your staff record. Ask People and Culture to correct it.')} />
        <TextField label={t('Surname')} value={profile.lastName || ''} disabled />
        <TextField select label={t('Marital status')} required={req('maritalStatus')} value={v.maritalStatus} onChange={set('maritalStatus')} onBlur={touch('maritalStatus')} error={!!errorOf('maritalStatus')} helperText={msg('maritalStatus')}>
          {MARITAL.map((m) => <MenuItem key={m} value={m}>{t(m)}</MenuItem>)}
        </TextField>
        <TextField
          label={t('Date of birth')}
          type="date"
          required={req('dob')}
          value={v.dob}
          onChange={set('dob')} onBlur={touch('dob')}
          error={!!errorOf('dob')}
          disabled={!!dob.pending}
          InputLabelProps={{ shrink: true }}
          helperText={msg('dob') || (dob.pending ? t('Waiting for People and Culture. Withdraw it below to change it.') : t('A new date is checked by People and Culture before it is used for loans.'))}
        />
        <div className={s.full}>
          <DobStatus status={dob} canWithdraw={!!dob.pending && dob.pending.submittedById === myId} onWithdraw={() => onSave(() => dobApi.withdraw(dob.pending.id).then(() => profileApi.get()))} />
        </div>
        <NidaField label={t('NIDA number')} required={req('nida')} value={v.nida} onChange={set('nida')} onBlur={touch('nida')} error={!!errorOf('nida')} helperText={msg('nida') || t('20 digits as on your national ID card, for example 19800630-13140-00004-20. The hyphens are added for you.')} />
        <CountryField label={t('Nationality')} required={req('nationality')} value={v.nationality} onChange={set('nationality')} onBlur={touch('nationality')} error={!!errorOf('nationality')} helperText={msg('nationality')} />
        <PhoneField label={t('Mobile phone')} required={req('mobile')} value={v.mobile} onChange={set('mobile')} onBlur={touch('mobile')} error={!!errorOf('mobile')} helperText={msg('mobile')} />
        <PhoneField label={t('Work phone')} value={v.workPhone} onChange={set('workPhone')} onBlur={touch('workPhone')} error={!!errorOf('workPhone')} helperText={msg('workPhone') || t('Optional.')} />
      </div>

      <h4 style={{ marginTop: 24 }}>{t('Residence')}</h4>
      {p.residence && !p.address?.region && (
        <p className="small muted" style={{ marginTop: 4 }}>
          {t('You gave your residence earlier as "{residence}". Enter it again below using the new fields.', { residence: p.residence })}
        </p>
      )}
      <div className={s.grid}>
        <div style={{ display: 'contents' }} onBlur={touch('address')}>
          <AddressFields value={v.address} onChange={set('address')} errorOf={addressError} />
        </div>
      </div>
      <div className="row" style={{ marginTop: 24 }}><Button type="submit" variant="contained">{t('Save personal details')}</Button></div>
    </form>
  );
}

function EmploymentTab({ profile, roles, permissions, mfaRequired, onSave }) {
  const t = useT();
  const e = profile.employment;
  const [editingDate, setEditingDate] = useState(false);
  const [dateJoined, setDateJoined] = useState(e.dateJoined || '');
  const [dateError, setDateError] = useState('');
  const saveDate = () => {
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(dateJoined) && !Number.isNaN(Date.parse(dateJoined)) && new Date(dateJoined).toISOString().slice(0, 10) === dateJoined && dateJoined <= new Date().toISOString().slice(0, 10);
    if (!valid) { setDateError('Enter a valid joining date that is not in the future.'); return; }
    setDateError('');
    onSave(() => profileApi.saveDateJoined(dateJoined));
    setEditingDate(false);
  };
  return (
    <>
      <Alert severity="info">
        <AlertTitle>{t('People and Culture maintains these details')}</AlertTitle>
        {t('If something is wrong, ask them to correct your staff record. Your category decides your approval route.')}
      </Alert>
      {!e.dateJoined && <Alert severity="warning" sx={{ mb: 2 }}><AlertTitle>{t('Profile Update Required')}</AlertTitle>{t('Your employment joining date is missing from your staff profile. Please enter your Date Joined before applying for a staff loan.')}</Alert>}
      <div style={{ marginBottom: 16 }}>
        {editingDate ? <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField type="date" label={t('Date Joined')} value={dateJoined} onChange={(event) => setDateJoined(event.target.value)} InputLabelProps={{ shrink: true }} error={!!dateError} helperText={dateError} inputProps={{ max: new Date().toISOString().slice(0, 10) }} />
          <Button variant="contained" onClick={saveDate}>{t('Save')}</Button>
          <Button onClick={() => { setEditingDate(false); setDateError(''); }}>{t('Cancel')}</Button>
        </div> : <Button variant="outlined" onClick={() => { setDateJoined(e.dateJoined || ''); setEditingDate(true); }}>{t('Update Date Joined')}</Button>}
      </div>
      <dl className={s.kv}>
        <dt>{t('Staff number')}</dt><dd>{profile.staffNo}</dd>
        <dt>{t('Job title')}</dt><dd>{e.title}</dd>
        <dt>{t('Department')}</dt><dd>{e.department || '—'}</dd>
        <dt>{t('Work station')}</dt><dd>{e.station}</dd>
        {e.stationHead?.name && (<><dt>{t('Head of station')}</dt><dd>{e.stationHead.name}{e.stationHead.phone ? `, ${e.stationHead.phone}` : ''}</dd></>)}
        <dt>{t('Employment type')}</dt><dd>{t(e.employmentType || '—')}{e.probation?.onProbation ? `, ${t('on probation until {date}', { date: formatDate(e.probation.endsOn) })}` : ''}</dd>
        <dt>{t('Category')}</dt><dd>{t(e.category || '—')}</dd>
        <dt>{t('Date joined')}</dt><dd>{formatDate(e.dateJoined)}</dd>
        {e.contractEndDate && (<><dt>{t('Contract ends')}</dt><dd>{formatDate(e.contractEndDate)}</dd></>)}
        <dt>{t('Retirement date')}</dt><dd>{e.retirementDate ? formatDate(e.retirementDate) : <span className="muted">{t('Worked out once your date of birth is verified')}</span>}</dd>
        <dt>{t('Approval route')}</dt><dd>{t(profile.route.description)}</dd>
        {profile.route.limitedCredit && (<><dt>{t('Credit Analyst sees')}</dt><dd>{t('Only your name, mobile number and NIDA number')}</dd></>)}
      </dl>
      <h4 style={{ marginTop: 24 }}>{t('Your access in Staff Loans')}</h4>
      <p className="small muted">{t('Roles are assigned by a system administrator.')}</p>
      <dl className={s.kv}>
        <dt>{t('Roles')}</dt><dd>{roles.map((r) => t(r.name)).join(', ')}</dd>
        <dt>{t('Permissions')}</dt><dd>{permissions.length}</dd>
        <dt>{t('Sign-in check')}</dt><dd>{mfaRequired ? t('Password and one-time code (MFA)') : t('Password')}</dd>
      </dl>
    </>
  );
}

function BankTab({ profile, requiredKeys, onSave, onFixed }) {
  const t = useT();
  const b = profile.bank || {};
  const req = (k) => requiredKeys.has(`bank.${k}`);
  const rules = useMemo(
    () => ({ bank: ruleFor(req('bank')), branch: ruleFor(req('branch'), RULES.branch), accountName: ruleFor(req('accountName')), accountNo: ruleFor(req('accountNo'), RULES.accountNo) }),
    [requiredKeys] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const form = useValidatedForm({ bank: b.bank || '', branch: b.branch || '', accountName: b.accountName || '', accountNo: b.accountNo || '' }, rules);
  const { values: v, set, touch, errorOf } = form;
  useFixed(form.serverLeft, onFixed);
  useEffect(() => form.setServerErrors(flat(profile.errors)), [profile.errors]); // eslint-disable-line react-hooks/exhaustive-deps
  const field = (k, label, extra = {}) => {
    const m = errorOf(k);
    return <TextField label={t(label)} required={req(k)} value={v[k]} onChange={set(k)} onBlur={touch(k)} error={!!m} helperText={m ? t(m) : undefined} {...extra} />;
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); form.attempt(); onSave(() => profileApi.saveBank(v)); }} noValidate>
      <p className="small muted">{t('Your LFB account is filled in for you. Check the branch and account number.')}</p>
      <div className={s.grid}>
        {field('bank', 'Bank')}
        {field('branch', 'Branch')}
        {field('accountName', 'Account name')}
        {field('accountNo', 'Account number', { inputProps: { inputMode: 'numeric', className: 'num' } })}
      </div>
      <div className="row" style={{ marginTop: 24 }}><Button type="submit" variant="contained">{t('Save bank details')}</Button></div>
    </form>
  );
}

function KinTab({ profile, requiredKeys, onSave, onFixed }) {
  const t = useT();
  const k = profile.nextOfKin?.[0] || {};
  const req = (f) => requiredKeys.has(`nextOfKin.0.${f}`);
  const rules = useMemo(
    () => ({ firstName: ruleFor(req('firstName')), lastName: ruleFor(req('lastName')), relationship: ruleFor(req('relationship')), phone: ruleFor(req('phone'), RULES.phone), address: ruleFor(req('address')) }),
    [requiredKeys] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const form = useValidatedForm({ firstName: k.firstName || '', lastName: k.lastName || '', relationship: k.relationship || '', phone: k.phone || '', employer: k.employer || '', address: k.address || '' }, rules);
  const { values: v, set, touch, errorOf } = form;
  useFixed(form.serverLeft, onFixed);
  useEffect(() => form.setServerErrors(Object.fromEntries(Object.entries(flat(profile.errors)).map(([key, m]) => [key.replace(/^nextOfKin\.0\./, ''), m]))), [profile.errors]); // eslint-disable-line react-hooks/exhaustive-deps
  const msg = (f) => {
    const m = errorOf(f);
    return m ? t(m) : undefined;
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); form.attempt(); onSave(() => profileApi.saveKin([v, ...(profile.nextOfKin || []).slice(1)])); }} noValidate>
      <p className="small muted">{t('At least one next of kin is required.')}</p>
      <div className={s.grid}>
        <TextField label={t('First Name')} required={req('firstName')} value={v.firstName} onChange={set('firstName')} onBlur={touch('firstName')} error={!!msg('firstName')} helperText={msg('firstName')} />
        <TextField label={t('Surname')} required={req('lastName')} value={v.lastName} onChange={set('lastName')} onBlur={touch('lastName')} error={!!msg('lastName')} helperText={msg('lastName')} />
        <TextField select label={t('Relationship')} required={req('relationship')} value={v.relationship} onChange={set('relationship')} onBlur={touch('relationship')} error={!!msg('relationship')} helperText={msg('relationship')}>
          {RELATIONSHIPS.map((r) => <MenuItem key={r} value={r}>{t(r)}</MenuItem>)}
        </TextField>
        <PhoneField label={t('Phone')} required={req('phone')} value={v.phone} onChange={set('phone')} onBlur={touch('phone')} error={!!msg('phone')} helperText={msg('phone')} />
        <TextField label={t('Employer')} value={v.employer} onChange={set('employer')} helperText={t('Optional.')} />
        <TextField label={t('Residential address')} required={req('address')} value={v.address} onChange={set('address')} onBlur={touch('address')} error={!!msg('address')} helperText={msg('address')} className={s.full} />
      </div>
      <div className="row" style={{ marginTop: 24 }}><Button type="submit" variant="contained">{t('Save next of kin')}</Button></div>
    </form>
  );
}

/**
 * Existing staff loans taken outside Staff Loans (decision 19). They count towards the
 * running loans per product (BR-07) and start the reapply wait (NS-02). The limit itself
 * is worked out from the payslip attached to each application (D-78, D-80).
 */
function PayTab({ profile, onSave }) {
  const t = useT();
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
      <h4>{t('Your pay')}</h4>
      <p className="small muted">{t('When you apply, you attach your latest payslip. Your limit is worked out from its Basic Pay: pension (10%) and PAYE come off Basic Pay to give your Net Pay, and all your staff loan instalments together may take up to half of it a month.')}</p>

      <h4 style={{ marginTop: 24 }}>{t('Existing LFB staff loans from before Staff Loans')}</h4>
      <p className="small muted">{t('Loans taken on paper are not in this system. If you know the product and the date it was paid out, add them; they count towards the loans you may have per product, and you can apply for the same product again six months after that date.')}</p>
      {lfb.map((l, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className={s.loanRow4}>
          <TextField label={t('Loan')} value={l.description || ''} onChange={(e) => setL(i, { description: e.target.value })} placeholder={t('Staff loan (paper)')} />
          <TextField select label={t('Product (optional)')} value={l.productId || ''} onChange={(e) => setL(i, { productId: e.target.value || null })}>
            <MenuItem value="">{t('Not sure')}</MenuItem>
            {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
          <TextField label={t('Paid out on (optional)')} type="date" value={l.disbursedOn || ''} onChange={(e) => setL(i, { disbursedOn: e.target.value || null })} InputLabelProps={{ shrink: true }} />
          <MoneyInput label={t('Monthly instalment')} value={l.instalment} onChange={(val) => setL(i, { instalment: val })} />
          <IconButton aria-label={t('Remove staff loan {n}', { n: i + 1 })} onClick={() => setLfb(lfb.filter((_, j) => j !== i))}>×</IconButton>
        </div>
      ))}
      <Button size="small" onClick={() => setLfb([...lfb, { description: t('Staff loan (paper)'), instalment: null }])}>{t('Add a staff loan')}</Button>
      <div className="row" style={{ marginTop: 16 }}><Button type="submit" variant="contained">{t('Save existing staff loans')}</Button></div>
    </form>
  );
}

export default function ProfilePage() {
  const t = useT();
  const { roles, permissions, mfaRequired } = useSelector((st) => st.auth);
  const [profile, setProfile] = useState(null);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => searchParams.get('tab') === 'employment' ? 'employment' : 'personal');
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  // "Check the highlighted fields" goes once those fields are corrected; other failures stay.
  const [errorCode, setErrorCode] = useState(null);
  const fixed = () => {
    if (errorCode === 'VALIDATION_FAILED') setError(null);
  };
  const [version, setVersion] = useState(0);

  useEffect(() => {
    profileApi.get().then(setProfile).catch((e) => setError(apiError(e).message));
  }, []);

  const requiredKeys = useMemo(() => new Set(profile?.completeness.required || []), [profile]);

  if (error && !profile) return <div className="page"><Alert severity="error">{error}</Alert></div>;
  if (!profile) return <div className="page"><LoadingSkeleton label={t('Loading…')} rows={5} /></div>;

  const c = profile.completeness;
  const missIn = (tb) => c.missing.filter((m) => m.tab === tb).length;

  /** Saves a tab; on success moves to the next tab with missing details (prototype). */
  const save = async (fn) => {
    setToast(null);
    setError(null);
    setFieldErrors({});
    try {
      const next = await fn();
      setProfile(next);
      setVersion((n) => n + 1);
      const order = TABS.map((x) => x[0]);
      const nextMissing = order.find((x) => next.completeness.missing.some((m) => m.tab === x));
      // D-97: complete is not enough while People and Culture still have something to do.
      const ready = next.completeness.complete && !next.applyBlockers?.length;
      setToast(ready ? t('Profile complete. You can now apply for a loan.') : next.completeness.complete ? t('Profile complete.') : t('Saved.'));
      if (nextMissing) setTab(nextMissing);
    } catch (err) {
      const x = apiError(err);
      setFieldErrors(x.details || {});
      setError(x.message);
      setErrorCode(x.code);
    }
  };

  const shown = { ...profile, errors: fieldErrors };

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('My profile')}</h1>
          <p>{t('Complete every required detail once. Each application fills in from here.')}</p>
        </div>
        <div style={{ minWidth: 240 }}>
          <Meter value={c.done} max={c.total} label={t('{done} of {total} required details', { done: c.done, total: c.total })} />
        </div>
      </div>
      <div className="stack">
        {!c.complete && (
          <Alert severity="warning">
            <AlertTitle>{t('You can apply once your profile is complete')}</AlertTitle>
            {t('Missing: {list}.', { list: c.missing.map((m) => (m.invalid ? t('{label} (check the format)', { label: t(m.label) }) : t(m.label))).join(', ') })}
          </Alert>
        )}
        <ActionFeedback open={Boolean(toast)} message={toast} onClose={() => setToast(null)} />
        {c.complete && <ApplyBlockers blockers={profile.applyBlockers} />}
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Tabs value={tab} onChange={(_, val) => setTab(val)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 3 }} aria-label={t('Profile sections')}>
              {TABS.map(([k, l]) => (
                <Tab key={k} value={k} label={<span>{t(l)}{missIn(k) ? <span className={s.count}>{missIn(k)}</span> : null}</span>} />
              ))}
            </Tabs>
            {tab === 'personal' && <PersonalTab key={`personal${version}`} profile={shown} requiredKeys={requiredKeys} onSave={save} onFixed={fixed} />}
            {tab === 'employment' && <EmploymentTab profile={profile} roles={roles} permissions={permissions} mfaRequired={mfaRequired} onSave={save} />}
            {tab === 'bank' && <BankTab key={`bank${version}`} profile={shown} requiredKeys={requiredKeys} onSave={save} onFixed={fixed} />}
            {tab === 'kin' && <KinTab key={`kin${version}`} profile={shown} requiredKeys={requiredKeys} onSave={save} onFixed={fixed} />}
            {tab === 'pay' && <PayTab key={`pay${version}`} profile={shown} onSave={save} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
