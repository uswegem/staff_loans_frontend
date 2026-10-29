// Apply wizard (prototype wStep1 to wStep4; FR-05 to FR-12, FR-33 to FR-35).
// Step 2 details with the live calculator, step 3 documents, step 4 review, step 5
// read and sign the agreement. Signing submits; there is no other way to submit.

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, Checkbox, FormControlLabel, MenuItem, Slider, TextField } from '@mui/material';
import { applicationsApi } from '../../api/applications';
import { apiError } from '../../api/client';
import { quote as calcQuote } from '../../lib/calc/loanCalculator';
import { todayEat } from '../../lib/dates';
import { formatNumber, formatTzs } from '../../lib/format';
import MoneyInput from '../../components/MoneyInput';
import LoanRoute from '../../components/LoanRoute';
import CalculatorPanel from './CalculatorPanel';
import AgreementDoc from './AgreementDoc';
import s from './apply.module.css';

const STEPS = ['Choose a loan', 'Loan details', 'Documents', 'Review', 'Sign and submit'];

export function Steps({ step }) {
  return (
    <ol className={s.steps} aria-label="Application steps">
      {STEPS.map((label, i) => (
        <li key={label} className={i === step ? s.on : i < step ? s.done : undefined} aria-current={i === step ? 'step' : undefined}>
          {label}
        </li>
      ))}
    </ol>
  );
}

const CONSENTS = [
  ['truth', 'Ninathibitisha kwamba taarifa zote nilizotoa katika maombi haya ni sahihi na kamili.', 'I confirm that all the information in this application is true and complete.'],
  ['deduct', 'Ninaruhusu Mkopeshaji kukata marejesho ya mkopo kwenye mshahara wangu au akaunti yangu kama nilivyochagua.', 'I authorise the lender to recover repayments from my salary or my account, as I chose.'],
  ['crb', 'Ninaruhusu taarifa zangu za mkopo kuangaliwa na kuwasilishwa kwa ofisi za kumbukumbu za mikopo.', 'I consent to my credit information being checked with, and reported to, credit reference bureaus.'],
  ['sms', 'Ninakubali kupokea ujumbe mfupi (SMS) kuhusu salio, malipo na malimbikizo ya mkopo huu.', "I agree to receive SMS about this loan's balance, payments and arrears."],
];

function formOf(app) {
  return {
    amount: app.amount,
    tenor: app.tenor || Math.min(app.product.maxTenor, Math.max(app.product.minTenor, 12)),
    purpose: app.purpose || '',
    productFields: app.productFields || {},
    repaymentMethod: app.repayment?.method || 'payroll',
    topUp: { on: !!app.topUp?.on, loanRef: app.topUp?.loanRef || '', instalment: app.topUp?.instalment ?? null },
    probationReason: app.probation?.reason || '',
  };
}

function bodyOf(form, app) {
  const body = {
    amount: form.amount ?? null,
    tenor: form.tenor ?? null,
    purpose: form.purpose,
    productFields: form.productFields,
    repaymentMethod: form.repaymentMethod,
    topUp: form.topUp.on ? { on: true, loanRef: form.topUp.loanRef, instalment: form.topUp.instalment } : { on: false },
  };
  if (app.probation.onProbation) body.probationReason = form.probationReason;
  return body;
}

/** The same calculation as the API, for instant feedback while typing. */
function useLiveQuote(app, form) {
  return useMemo(
    () =>
      calcQuote({
        amount: form.amount || 0,
        tenor: form.tenor || 0,
        topUp: form.topUp.on,
        topUpInstalment: form.topUp.instalment || 0,
        pay: app.payInputs,
        pricing: app.pricing,
        startDay: todayEat(),
        dueDay: app.firstDueDay,
      }),
    [app, form]
  );
}

function FieldInput({ f, value, onChange, error }) {
  const common = { label: f.label, required: f.mandatory, error: !!error, helperText: error, fullWidth: true };
  if (f.type === 'money') return <MoneyInput {...common} value={value ?? null} onChange={onChange} />;
  if (f.type === 'select') {
    return (
      <TextField select {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {f.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
      </TextField>
    );
  }
  return (
    <TextField
      {...common}
      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
      multiline={f.type === 'textarea'}
      minRows={f.type === 'textarea' ? 3 : undefined}
      value={value ?? ''}
      onChange={(e) => onChange(f.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
    />
  );
}

function DetailsStep({ app, form, setForm, errors, checks, onBack, onNext, busy }) {
  const p = app.product;
  const q = useLiveQuote(app, form);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const cap = Math.min(p.maxAmount, Math.floor((app.payInputs.basic || 0) * p.salaryMultiple));
  return (
    <div className={s.split}>
      <Card>
        <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
          <h3>{p.name}</h3>
        </div>
        <form style={{ padding: 24 }} noValidate onSubmit={(e) => { e.preventDefault(); onNext(); }}>
          <div className={s.grid}>
            <MoneyInput label="Amount" required value={form.amount ?? null} onChange={(v) => set({ amount: v })} error={!!errors.amount} helperText={errors.amount || `TZS ${formatNumber(p.minAmount)} to TZS ${formatNumber(cap)}`} />
            <div>
              <TextField label="Tenor (months)" required type="number" value={form.tenor ?? ''} onChange={(e) => set({ tenor: e.target.value === '' ? null : Number(e.target.value) })} error={!!errors.tenor} helperText={errors.tenor || `${p.minTenor} to ${p.maxTenor} months`} inputProps={{ min: p.minTenor, max: p.maxTenor, inputMode: 'numeric' }} />
              <Slider aria-label="Tenor slider" min={p.minTenor} max={p.maxTenor} value={Math.min(p.maxTenor, Math.max(p.minTenor, form.tenor || p.minTenor))} onChange={(_, v) => set({ tenor: v })} sx={{ color: '#000' }} />
            </div>
            <TextField label="Purpose of the loan" required className={s.full} value={form.purpose} onChange={(e) => set({ purpose: e.target.value })} error={!!errors.purpose} helperText={errors.purpose} />
            {p.fields.map((f) => (
              <div key={f.key} className={f.type === 'textarea' ? s.full : undefined}>
                <FieldInput f={f} value={form.productFields[f.key]} error={errors[`productFields.${f.key}`]} onChange={(v) => set({ productFields: { ...form.productFields, [f.key]: v } })} />
              </div>
            ))}
            {app.probation.onProbation && (
              <TextField
                className={s.full}
                label="Reason for applying during probation"
                required
                multiline
                minRows={2}
                value={form.probationReason}
                onChange={(e) => set({ probationReason: e.target.value })}
                error={!!errors.probationReason}
                helperText={errors.probationReason || 'You are on probation until the date on your profile. People and Culture will verify your reason.'}
              />
            )}
          </div>

          {p.topUpAllowed && (
            <div style={{ marginTop: 12 }}>
              <FormControlLabel
                control={<Checkbox checked={form.topUp.on} onChange={(e) => set({ topUp: { ...form.topUp, on: e.target.checked } })} />}
                label={
                  <span>
                    <b>This tops up an existing staff loan</b>
                    <br />
                    <span className="small muted">The old loan&apos;s instalment is added back for affordability, and its balance is settled from the new loan. OPS confirms the balance from core banking.</span>
                  </span>
                }
              />
              {form.topUp.on && (
                <div className={s.grid} style={{ margin: '8px 0 8px 32px' }}>
                  <TextField label="Loan being topped up" value={form.topUp.loanRef} onChange={(e) => set({ topUp: { ...form.topUp, loanRef: e.target.value } })} error={!!errors['topUp.loanRef']} helperText={errors['topUp.loanRef'] || 'Reference or description'} />
                  <MoneyInput label="Its monthly instalment" value={form.topUp.instalment} onChange={(v) => set({ topUp: { ...form.topUp, instalment: v } })} error={!!errors['topUp.instalment']} helperText={errors['topUp.instalment']} />
                </div>
              )}
            </div>
          )}

          <h4 style={{ margin: '24px 0 10px' }}>How will you repay?</h4>
          <div className={s.radios} role="radiogroup" aria-label="Repayment method">
            {p.repaymentMethods.includes('payroll') && (
              <label className={s.radioCard}>
                <input type="radio" name="method" value="payroll" checked={form.repaymentMethod === 'payroll'} onChange={() => set({ repaymentMethod: 'payroll' })} />
                <span><b>Payroll deduction</b><span className="small muted">Deducted from your salary each month.</span></span>
              </label>
            )}
            {p.repaymentMethods.includes('account') && (
              <label className={s.radioCard}>
                <input type="radio" name="method" value="account" checked={form.repaymentMethod === 'account'} onChange={() => set({ repaymentMethod: 'account' })} />
                <span>
                  <b>Debit from my account</b>
                  <span className="small muted">{app.bank?.bank}, {app.bank?.branch}, account {app.bank?.accountNo || '—'}. Change it in your profile.</span>
                </span>
              </label>
            )}
          </div>
          {errors['repayment.method'] && <p className="small" style={{ color: 'var(--bad)', fontWeight: 600 }}>{errors['repayment.method']}</p>}

          {checks.length > 0 && form.amount && form.tenor ? (
            <Alert severity="error" sx={{ mt: 2.5 }}>
              <AlertTitle>Fix this before you continue</AlertTitle>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{checks.map((c) => <li key={c}>{c}</li>)}</ul>
            </Alert>
          ) : null}

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 24 }}>
            <Button onClick={onBack}>Back</Button>
            <Button type="submit" variant="contained" disabled={busy}>Continue to documents</Button>
          </div>
        </form>
      </Card>
      <Card className={s.sticky}>
        <CalculatorPanel q={q} amount={form.amount} tenor={form.tenor} topUp={form.topUp.on} />
      </Card>
    </div>
  );
}

function DocumentsStep({ app, onChanged, onBack, onNext }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const p = app.product;
  const suggested = [...p.requiredDocuments, ...p.optionalDocuments];
  const add = async (files) => {
    setBusy(true);
    setError(null);
    try {
      for (const f of [...files]) {
        // eslint-disable-next-line no-await-in-loop
        await applicationsApi.addDocument(app.id, f);
      }
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
      onChanged();
    }
  };
  return (
    <Card>
      <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
        <h3>Supporting documents</h3>
        <span className="tag">Optional</span>
      </div>
      <div style={{ padding: 24 }}>
        <p>Documents are optional. Adding them can help reviewers decide faster.</p>
        {suggested.length > 0 && <p className="small muted">Useful for {p.name}: {suggested.join('; ')}.</p>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <label className={s.drop}>
          <div><b style={{ color: '#000' }}>{busy ? 'Uploading…' : 'Choose files'}</b>{busy ? '' : ' or drag them here'}</div>
          <div className="xs">PDF, JPG or PNG, up to the size limit set by the bank</div>
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" aria-label="Choose files" disabled={busy} onChange={(e) => add(e.target.files)} />
        </label>
        <ul className={s.files}>
          {app.documents.map((d) => (
            <li key={d.id}>
              <span>{d.originalName} <span className="muted xs">{Math.ceil(d.size / 1024)} KB</span></span>
              <Button size="small" variant="text" sx={{ color: 'var(--bad)' }} onClick={async () => { await applicationsApi.removeDocument(app.id, d.id); onChanged(); }} aria-label={`Remove ${d.originalName}`}>Remove</Button>
            </li>
          ))}
        </ul>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 24 }}>
          <Button onClick={onBack}>Back</Button>
          <Button variant="contained" onClick={onNext}>Review application</Button>
        </div>
      </div>
    </Card>
  );
}

function ReviewStep({ app, form, onBack, onNext, onEdit }) {
  const p = app.product;
  const q = useLiveQuote(app, form);
  const draftRoute = { ...app, status: 'draft' };
  return (
    <div className={s.split}>
      <div className="stack">
        <Card>
          <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
            <h3>Loan</h3>
            <Button size="small" variant="text" onClick={() => onEdit(1)}>Edit</Button>
          </div>
          <dl className={s.kv} style={{ padding: 24 }}>
            <dt>Product</dt><dd>{p.name}</dd>
            <dt>Amount</dt><dd>{formatTzs(form.amount)}</dd>
            <dt>Tenor</dt><dd>{form.tenor} months</dd>
            <dt>Purpose</dt><dd>{form.purpose}</dd>
            {p.fields.map((f) => (
              <Fragment key={f.key}><dt>{f.label}</dt><dd>{f.type === 'money' ? formatTzs(form.productFields[f.key]) : String(form.productFields[f.key] ?? '—')}</dd></Fragment>
            ))}
            <dt>Repayment</dt><dd>{form.repaymentMethod === 'payroll' ? 'Payroll deduction' : `Debit from account ${app.bank?.accountNo}`}</dd>
            {form.topUp.on && (<><dt>Top-up of</dt><dd>{form.topUp.loanRef}</dd></>)}
            {app.probation.onProbation && (<><dt>Probation reason</dt><dd>{form.probationReason}</dd></>)}
          </dl>
        </Card>
        <Card>
          <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
            <h3>Documents</h3>
            <Button size="small" variant="text" onClick={() => onEdit(2)}>Edit</Button>
          </div>
          <div className="small" style={{ padding: 24 }}>{app.documents.length ? app.documents.map((d) => <div key={d.id}>{d.originalName}</div>) : <span className="muted">None attached</span>}</div>
        </Card>
        <Card>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}><h3>What happens next</h3></div>
          <div style={{ padding: 24 }}>
            <LoanRoute app={draftRoute} />
            <p className="small muted" style={{ marginTop: 12 }}>Each reviewer has a working-hours target. You can follow every step and get an in-app notification when it moves.</p>
          </div>
        </Card>
      </div>
      <Card className={s.sticky}>
        <CalculatorPanel q={q} amount={form.amount} tenor={form.tenor} topUp={form.topUp.on} />
        <div style={{ padding: 24, borderTop: '1px solid var(--line-2)' }}>
          <p className="small muted" style={{ margin: '0 0 12px' }}>Next you read the loan agreement for these terms and sign it. Signing submits the application.</p>
          <Button variant="contained" fullWidth onClick={onNext}>Continue to agreement</Button>
          <Button fullWidth sx={{ mt: 1 }} onClick={onBack}>Back</Button>
        </div>
      </Card>
    </div>
  );
}

function SignStep({ app, onBack, onSigned }) {
  const docRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [read, setRead] = useState(false);
  const [progress, setProgress] = useState(0);
  const [consents, setConsents] = useState({ truth: false, deduct: false, crb: false, sms: false });
  const [agree, setAgree] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const resubmit = app.status === 'returned';

  const load = useCallback(async () => {
    try {
      setPreview(await applicationsApi.preview(app.id));
    } catch (err) {
      setError(apiError(err).message);
    }
  }, [app.id]);
  useEffect(() => {
    load();
  }, [load]);

  const onScroll = () => {
    const d = docRef.current;
    if (!d) return;
    const r = (d.scrollTop + d.clientHeight) / d.scrollHeight;
    setProgress(Math.min(100, r * 100));
    if (r > 0.985) setRead(true);
  };
  useEffect(() => {
    // A short document that needs no scrolling counts as read.
    const d = docRef.current;
    if (d && d.scrollHeight <= d.clientHeight + 4) {
      setRead(true);
      setProgress(100);
    }
  }, [preview]);

  const allTicked = Object.values(consents).every(Boolean) && agree;
  const sign = async (e) => {
    e.preventDefault();
    if (!allTicked) return setError('Tick every statement and the agreement to sign.');
    if (!password) return setError('Enter your password to sign.');
    setBusy(true);
    setError(null);
    try {
      const done = await applicationsApi.signAndSubmit(app.id, { consents, accepted: agree, scrolledToEnd: read, password, textSha256: preview.textSha256 });
      onSigned(done);
    } catch (err) {
      const x = apiError(err);
      if (x.code === 'AGREEMENT_CHANGED') {
        setRead(false);
        setProgress(0);
        await load();
      }
      setError(x.code === 'PASSWORD_WRONG' ? `Your password is not right. ${x.details.remainingAttempts} attempts left before the account locks.` : x.message);
      setPassword('');
      setBusy(false);
    }
    return undefined;
  };

  if (!preview) return error ? <Alert severity="error">{error}</Alert> : <p className="muted" role="status">Preparing your agreement…</p>;
  const t = preview.terms;

  return (
    <div className={s.split}>
      <div>
        {resubmit && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>You are signing a new agreement</AlertTitle>
            Your earlier signed agreement for {app.ref} is replaced by this one when you resubmit.
          </Alert>
        )}
        {preview.template.sample && <Alert severity="warning" sx={{ mb: 2 }}>Sample agreement text: Legal loads the approved version before go-live.</Alert>}
        <AgreementDoc ref={docRef} blocks={preview.blocks} onScroll={onScroll} />
        <div className={s.readbar} aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
        <p className="xs muted" role="status">{read ? 'You have reached the end of the agreement.' : 'Scroll to the end of the agreement to sign it.'}</p>
      </div>
      <Card className={s.sticky}>
        <form onSubmit={sign} noValidate>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}><h3>Sign and submit</h3></div>
          <div style={{ padding: 24 }}>
            <dl className={s.kv}>
              <dt>Amount</dt><dd>{formatTzs(t.amount)}</dd>
              <dt>Tenor</dt><dd>{t.tenor} months</dd>
              <dt>Instalment</dt><dd>{formatTzs(t.instalment)}</dd>
              <dt>Fees</dt><dd>{formatTzs(t.fees)}</dd>
              <dt>Total to repay</dt><dd>{formatTzs(t.totalRepayable)}</dd>
            </dl>
            <fieldset className={s.consents} disabled={!read}>
              <legend className="small" style={{ fontWeight: 700, margin: '14px 0 4px' }}>Declaration and consents</legend>
              {CONSENTS.map(([k, sw, en]) => (
                <label key={k} className={s.check}>
                  <input type="checkbox" checked={consents[k]} onChange={(e) => setConsents((c) => ({ ...c, [k]: e.target.checked }))} />
                  <span><b lang="sw">{sw}</b><br /><span className="xs muted">{en}</span></span>
                </label>
              ))}
              <label className={s.check}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span><b lang="sw">Nimesoma, nimeelewa na kukubali vifungu vyote vya mkataba huu.</b><br /><span className="xs muted">I have read, understood and accept all the terms of this agreement.</span></span>
              </label>
              <TextField label="Enter your password to sign" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mt: 1 }} />
            </fieldset>
            {error && <p className="small" role="alert" style={{ color: 'var(--bad)', fontWeight: 600, margin: '10px 0 0' }}>{error}</p>}
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={!read || !allTicked || !password || busy}>
              {resubmit ? 'Sign and resubmit' : 'Sign agreement and submit'}
            </Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={onBack}>Back</Button>
            <p className="xs muted" style={{ marginTop: 12 }}>
              Signing records your name, time, IP address and a fingerprint of this exact text. The agreement takes effect when the application gets final approval on these terms. If a reviewer changes the amount or tenor, you accept a revised agreement before the loan is paid. If the application is rejected or withdrawn it becomes void; if it is returned, you sign a new one when you resubmit.
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function ApplyWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [form, setForm] = useState(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const saved = useRef(null);

  const load = useCallback(async () => {
    try {
      const a = await applicationsApi.get(id);
      setApp(a);
      setForm((f) => f || formOf(a));
      saved.current = JSON.stringify(bodyOf(formOf(a), a));
    } catch (err) {
      setError(apiError(err).message);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  // Save while typing (debounced) so the server's checks stay current.
  useEffect(() => {
    if (!app || !form || !app.editable) return undefined;
    const body = JSON.stringify(bodyOf(form, app));
    if (body === saved.current) return undefined;
    const t = setTimeout(async () => {
      try {
        const a = await applicationsApi.update(app.id, JSON.parse(body));
        saved.current = body;
        setApp(a);
      } catch {
        /* shown when continuing */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [form, app]);

  const saveNow = async () => {
    const a = await applicationsApi.update(app.id, bodyOf(form, app));
    saved.current = JSON.stringify(bodyOf(form, app));
    setApp(a);
    return a;
  };

  const next = async () => {
    setBusy(true);
    setError(null);
    try {
      const a = await saveNow();
      const c = a.checks;
      if (Object.keys(c.fieldErrors).length || c.checks.length || c.eligibility.length) {
        setError(Object.keys(c.fieldErrors).length ? 'Fill in the required fields.' : c.eligibility[0] || c.checks[0]);
      } else setStep(2);
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !app) return <div className="page"><Alert severity="error">{error}</Alert></div>;
  if (!app || !form) return <p className="muted" role="status">Loading…</p>;
  if (!app.editable) {
    return (
      <div className="page">
        <Alert severity="info" action={<Button component={RouterLink} to={`/applications/${app.id}`}>View application</Button>}>{app.ref} is {app.statusLabel.toLowerCase()}. It can no longer be changed.</Alert>
      </div>
    );
  }

  const correcting = app.status === 'returned';
  const title = correcting ? `Correct ${app.ref}` : 'Apply for a loan';

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}>
        <RouterLink to="/" style={{ color: 'inherit' }}>Home</RouterLink> / {correcting ? <><RouterLink to={`/applications/${app.id}`} style={{ color: 'inherit' }}>{app.ref}</RouterLink> / </> : null}{title}
      </div>
      <div className="pagehead">
        <div>
          <h1>{title}</h1>
          <p>{correcting ? 'Make the changes asked for, then resubmit. It goes back to the first review stage.' : `${app.ref}. Your details fill in from your profile. You only add the loan request.`}</p>
        </div>
        {!correcting && <Button variant="text" onClick={async () => { await applicationsApi.withdraw(app.id, 'Draft cancelled').catch(() => {}); navigate('/'); }}>Cancel application</Button>}
      </div>
      <Steps step={step} />
      {error && step < 4 && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {!app.product.available && <Alert severity="error" sx={{ mb: 2 }}>This product is no longer available for new applications.</Alert>}
      {step === 1 && <DetailsStep app={app} form={form} setForm={setForm} errors={app.checks.fieldErrors} checks={[...app.checks.eligibility, ...app.checks.checks]} busy={busy} onBack={() => navigate(correcting ? `/applications/${app.id}` : '/apply')} onNext={next} />}
      {step === 2 && <DocumentsStep app={app} onChanged={load} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <ReviewStep app={app} form={form} onBack={() => setStep(2)} onNext={() => setStep(4)} onEdit={setStep} />}
      {step === 4 && <SignStep app={app} onBack={() => setStep(3)} onSigned={(a) => navigate(`/applications/${a.id}?submitted=1`)} />}
    </div>
  );
}
