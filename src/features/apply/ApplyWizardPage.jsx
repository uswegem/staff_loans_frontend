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
import { formatNumber, formatTzs, formatDate } from '../../lib/format';
import MoneyInput from '../../components/MoneyInput';
import LoanRoute from '../../components/LoanRoute';
import CalculatorPanel from './CalculatorPanel';
import PayslipCard from './PayslipCard';
import AgreementDoc from './AgreementDoc';
import s from './apply.module.css';
import { useT } from '../../i18n';

const STEPS = ['Choose a loan', 'Loan details', 'Documents', 'Review', 'Sign and submit'];

export function Steps({ step }) {
  const t = useT();
  return (
    <ol className={s.steps} aria-label={t('Application steps')}>
      {STEPS.map((label, i) => (
        <li key={label} className={i === step ? s.on : i < step ? s.done : undefined} aria-current={i === step ? 'step' : undefined}>
          {t(label)}
        </li>
      ))}
    </ol>
  );
}

const CONSENTS = [
  ['truth', 'Ninathibitisha kwamba taarifa zote nilizotoa katika maombi haya ni sahihi na kamili.', 'I confirm that all the information in this application is true and complete.'],
  ['deduct', 'Ninaruhusu Mkopeshaji kukata marejesho ya mkopo kwenye mshahara wangu.', 'I authorise the lender to recover repayments from my salary or my account, as I chose.'],
  ['crb', 'Ninaruhusu taarifa zangu za mkopo kuangaliwa na kuwasilishwa kwa ofisi za kumbukumbu za mikopo.', 'I consent to my credit information being checked with, and reported to, credit reference bureaus.'],
  ['sms', 'Ninakubali kupokea ujumbe mfupi (SMS) kuhusu salio, malipo na malimbikizo ya mkopo huu.', "I agree to receive SMS about this loan's balance, payments and arrears."],
];

function formOf(app) {
  return {
    amount: app.amount,
    tenor: app.tenor || Math.min(app.product.maxTenor, Math.max(app.product.minTenor, 12)),
    purpose: app.purpose || '',
    productFields: app.productFields || {},
    topUp: { on: !!app.topUp?.on, applicationId: app.topUp?.applicationId || '' },
    probationReason: app.probation?.reason || '',
  };
}

function bodyOf(form, app) {
  const body = {
    amount: form.amount ?? null,
    tenor: form.tenor ?? null,
    purpose: form.purpose,
    productFields: form.productFields,
    topUp: form.topUp.on ? { on: true, applicationId: form.topUp.applicationId || null } : { on: false },
  };
  if (app.probation.onProbation) body.probationReason = form.probationReason;
  return body;
}

/**
 * D-87: the staff member's other running loans in Staff Loans count against one 50% cap;
 * the loan chosen for a top-up is added back (its instalment as recorded in Staff Loans).
 */
function existingFor(app, form) {
  const loans = app.existingLoans || [];
  const chosen = form.topUp.on ? loans.find((l) => l.applicationId === form.topUp.applicationId) : null;
  return { others: loans.filter((l) => l !== chosen).reduce((n, l) => n + l.instalment, 0), addBack: chosen?.instalment || 0 };
}

/** The same calculation as the API, for instant feedback while typing. */
function useLiveQuote(app, form) {
  return useMemo(
    () =>
      calcQuote({
        amount: form.amount || 0,
        tenor: form.tenor || 0,
        topUp: form.topUp.on,
        pay: app.payInputs,
        existing: existingFor(app, form),
        pricing: app.pricing,
        startDay: todayEat(),
        dueDay: app.firstDueDay,
        maxTenor: app.quote.maxTenor,
        maxAmountCap: app.product.maxAmount,
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

function DetailsStep({ app, form, setForm, errors, checks, onBack, onNext, busy, onAppChanged }) {
  const t = useT();
  const p = app.product;
  const q = useLiveQuote(app, form);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const topUpLoans = (app.existingLoans || []).filter((l) => l.canTopUp);
  // D-82: the longest tenor that ends on or before the retirement cutoff (backend figure).
  const r = app.retirement || {};
  const maxTenor = r.maxTenor ? Math.min(p.maxTenor, r.maxTenor) : p.maxTenor;
  const hint = app.payslip ? t('TZS {min} to TZS {max} (up to {n} months)', { min: formatNumber(p.minAmount), max: formatNumber(q.maxAmount), n: q.maxTenor }) : t('TZS {min} to TZS {max}; attach your payslip to see your maximum', { min: formatNumber(p.minAmount), max: formatNumber(p.maxAmount) });
  return (
    <div className={s.split}>
      <Card>
        <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
          <h3>{p.name}</h3>
        </div>
        <form style={{ padding: 24 }} noValidate onSubmit={(e) => { e.preventDefault(); onNext(); }}>
          <PayslipCard app={app} error={errors.payslip} onChanged={onAppChanged} />
          {r.cutoff && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('Your last instalment must fall on or before')}{' '}<b>{formatDate(r.cutoff)}</b> {t('({n} days before you turn {age}, from your verified date of birth).', { n: r.bufferDays, age: r.age })} {t('You can take up to')} <b>{t('{n} months', { n: maxTenor })}</b>{maxTenor < p.maxTenor ? ` ${t('(the product allows {n})', { n: p.maxTenor })}` : ''}.
            </Alert>
          )}
          <div className={s.grid}>
            <MoneyInput label={t('Amount')} required value={form.amount ?? null} onChange={(v) => set({ amount: v })} error={!!errors.amount} helperText={errors.amount || hint} />
            <div>
              <TextField label={t('Tenor (months)')} required type="number" value={form.tenor ?? ''} onChange={(e) => set({ tenor: e.target.value === '' ? null : Number(e.target.value) })} error={!!errors.tenor} helperText={errors.tenor || t('{min} to {max} months', { min: p.minTenor, max: maxTenor })} inputProps={{ min: p.minTenor, max: maxTenor, inputMode: 'numeric' }} />
              <Slider aria-label={t('Tenor slider')} min={p.minTenor} max={Math.max(p.minTenor, maxTenor)} value={Math.min(maxTenor, Math.max(p.minTenor, form.tenor || p.minTenor))} onChange={(_, v) => set({ tenor: v })} sx={{ color: 'var(--strong)' }} />
            </div>
            <TextField label={t('Purpose of the loan')} required className={s.full} value={form.purpose} onChange={(e) => set({ purpose: e.target.value })} error={!!errors.purpose} helperText={errors.purpose} />
            {p.fields.map((f) => (
              <div key={f.key} className={f.type === 'textarea' ? s.full : undefined}>
                <FieldInput f={f} value={form.productFields[f.key]} error={errors[`productFields.${f.key}`]} onChange={(v) => set({ productFields: { ...form.productFields, [f.key]: v } })} />
              </div>
            ))}
            {app.probation.onProbation && (
              <TextField
                className={s.full}
                label={t('Reason for applying during probation')}
                required
                multiline
                minRows={2}
                value={form.probationReason}
                onChange={(e) => set({ probationReason: e.target.value })}
                error={!!errors.probationReason}
                helperText={errors.probationReason || t('You are on probation until the date on your profile. People and Culture will verify your reason.')}
              />
            )}
          </div>

          {p.topUpAllowed && (
            <div style={{ marginTop: 12 }}>
              <FormControlLabel
                control={<Checkbox checked={form.topUp.on} onChange={(e) => set({ topUp: { ...form.topUp, on: e.target.checked } })} />}
                label={
                  <span>
                    <b>{t('This tops up an existing staff loan')}</b>
                    <br />
                    <span className="small muted">{t('Its balance is settled from the new loan, and its monthly deduction stops: the new instalment replaces it.')}</span>
                  </span>
                }
              />
              {form.topUp.on && (
                <div className={s.grid} style={{ margin: '8px 0 8px 32px' }}>
                  <TextField select label={t('Loan being topped up')} value={form.topUp.applicationId || ''} onChange={(e) => set({ topUp: { ...form.topUp, applicationId: e.target.value } })} error={!!errors['topUp.applicationId']} helperText={errors['topUp.applicationId'] || (topUpLoans.length ? t('One of your running loans in Staff Loans') : t('You have no running loan of this product in Staff Loans to top up.'))}>
                    {topUpLoans.map((l) => <MenuItem key={l.applicationId} value={l.applicationId}>{l.ref}: {t('TZS {amount} a month', { amount: formatNumber(l.instalment) })}</MenuItem>)}
                  </TextField>
                </div>
              )}
            </div>
          )}

          <p className="small muted" style={{ margin: '20px 0 0' }}>{t('Repayment: salary deduction, every month.')}</p>

          {checks.length > 0 && form.amount && form.tenor ? (
            <Alert severity="error" sx={{ mt: 2.5 }}>
              <AlertTitle>{t('Fix this before you continue')}</AlertTitle>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{checks.map((c) => <li key={c}>{c}</li>)}</ul>
            </Alert>
          ) : null}

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 24 }}>
            <Button onClick={onBack}>{t('Back')}</Button>
            <Button type="submit" variant="contained" disabled={busy}>{t('Continue to documents')}</Button>
          </div>
        </form>
      </Card>
      <Card className={s.sticky}>
        <CalculatorPanel q={q} amount={form.amount} tenor={form.tenor} topUp={form.topUp.on} hasPayslip={!!app.payslip} />
      </Card>
    </div>
  );
}

function DocumentsStep({ app, onChanged, onBack, onNext }) {
  const t = useT();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
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
        <h3>{t('Supporting documents')}</h3>
        <span className="tag">{t('Optional')}</span>
      </div>
      <div style={{ padding: 24 }}>
        <p>{t('Documents are optional. Adding them can help reviewers decide faster.')}</p>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <label className={s.drop}>
          <div><b style={{ color: 'var(--strong)' }}>{busy ? t('Uploading…') : t('Choose files')}</b>{busy ? '' : ` ${t('or drag them here')}`}</div>
          <div className="xs">{t('PDF, JPG or PNG, up to the size limit set by the bank')}</div>
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" aria-label={t('Choose files')} disabled={busy} onChange={(e) => add(e.target.files)} />
        </label>
        <ul className={s.files}>
          {app.documents.map((d) => (
            <li key={d.id}>
              <span>{d.originalName} <span className="muted xs">{Math.ceil(d.size / 1024)} KB</span></span>
              <Button size="small" variant="text" sx={{ color: 'var(--bad)' }} onClick={async () => { await applicationsApi.removeDocument(app.id, d.id); onChanged(); }} aria-label={`Remove ${d.originalName}`}>{t('Remove')}</Button>
            </li>
          ))}
        </ul>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 24 }}>
          <Button onClick={onBack}>{t('Back')}</Button>
          <Button variant="contained" onClick={onNext}>{t('Review application')}</Button>
        </div>
      </div>
    </Card>
  );
}

function ReviewStep({ app, form, onBack, onNext, onEdit }) {
  const t = useT();
  const p = app.product;
  const q = useLiveQuote(app, form);
  const draftRoute = { ...app, status: 'draft' };
  return (
    <div className={s.split}>
      <div className="stack">
        <Card>
          <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
            <h3>{t('Loan')}</h3>
            <Button size="small" variant="text" onClick={() => onEdit(1)}>{t('Edit')}</Button>
          </div>
          <dl className={s.kv} style={{ padding: 24 }}>
            <dt>{t('Product')}</dt><dd>{p.name}</dd>
            <dt>{t('Amount')}</dt><dd>{formatTzs(form.amount)}</dd>
            <dt>{t('Tenor')}</dt><dd>{t('{n} months', { n: form.tenor })}</dd>
            <dt>{t('Purpose')}</dt><dd>{form.purpose}</dd>
            {p.fields.map((f) => (
              <Fragment key={f.key}><dt>{f.label}</dt><dd>{f.type === 'money' ? formatTzs(form.productFields[f.key]) : String(form.productFields[f.key] ?? '—')}</dd></Fragment>
            ))}
            <dt>{t('Repayment')}</dt><dd>{t('Salary deduction')}</dd>
            {form.topUp.on && (<><dt>{t('Top-up of')}</dt><dd>{(app.existingLoans || []).find((l) => l.applicationId === form.topUp.applicationId)?.ref || '—'}</dd></>)}
            {app.probation.onProbation && (<><dt>{t('Probation reason')}</dt><dd>{form.probationReason}</dd></>)}
          </dl>
        </Card>
        <Card>
          <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
            <h3>{t('Documents')}</h3>
            <Button size="small" variant="text" onClick={() => onEdit(2)}>{t('Edit')}</Button>
          </div>
          <div className="small" style={{ padding: 24 }}>{app.documents.length ? app.documents.map((d) => <div key={d.id}>{d.originalName}</div>) : <span className="muted">{t('None attached')}</span>}</div>
        </Card>
        <Card>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}><h3>{t('What happens next')}</h3></div>
          <div style={{ padding: 24 }}>
            <LoanRoute app={draftRoute} />
            <p className="small muted" style={{ marginTop: 12 }}>{t('Each reviewer has a working-hours target. You can follow every step and get an in-app notification when it moves.')}</p>
          </div>
        </Card>
      </div>
      <Card className={s.sticky}>
        <CalculatorPanel q={q} amount={form.amount} tenor={form.tenor} topUp={form.topUp.on} />
        <div style={{ padding: 24, borderTop: '1px solid var(--line-2)' }}>
          <p className="small muted" style={{ margin: '0 0 12px' }}>{t('Next you read the loan agreement for these terms and sign it. Signing submits the application.')}</p>
          <Button variant="contained" fullWidth onClick={onNext}>{t('Continue to agreement')}</Button>
          <Button fullWidth sx={{ mt: 1 }} onClick={onBack}>{t('Back')}</Button>
        </div>
      </Card>
    </div>
  );
}

function SignStep({ app, onBack, onSigned }) {
  const t = useT();
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
    if (!allTicked) return setError(t('Tick every statement and the agreement to sign.'));
    if (!password) return setError(t('Enter your password to sign.'));
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
      setError(x.code === 'PASSWORD_WRONG' ? t('Your password is not right. {n} attempts left before the account locks.', { n: x.details.remainingAttempts }) : x.message);
      setPassword('');
      setBusy(false);
    }
    return undefined;
  };

  if (!preview) return error ? <Alert severity="error">{error}</Alert> : <p className="muted" role="status">{t('Preparing your agreement…')}</p>;
  const terms = preview.terms;

  return (
    <div className={s.split}>
      <div>
        {resubmit && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>{t('You are signing a new agreement')}</AlertTitle>
            {t('Your earlier signed agreement for {ref} is replaced by this one when you resubmit.', { ref: app.ref })}
          </Alert>
        )}
        {preview.template.sample && <Alert severity="warning" sx={{ mb: 2 }}>{t('Sample agreement text: Legal loads the approved version before go-live.')}</Alert>}
        <AgreementDoc ref={docRef} blocks={preview.blocks} onScroll={onScroll} />
        <div className={s.readbar} aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
        <p className="xs muted" role="status">{read ? t('You have reached the end of the agreement.') : t('Scroll to the end of the agreement to sign it.')}</p>
      </div>
      <Card className={s.sticky}>
        <form onSubmit={sign} noValidate>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}><h3>{t('Sign and submit')}</h3></div>
          <div style={{ padding: 24 }}>
            <dl className={s.kv}>
              <dt>{t('Amount')}</dt><dd>{formatTzs(terms.amount)}</dd>
              <dt>{t('Tenor')}</dt><dd>{t('{n} months', { n: terms.tenor })}</dd>
              <dt>{t('Instalment')}</dt><dd>{formatTzs(terms.instalment)}</dd>
              <dt>{t('Fees')}</dt><dd>{formatTzs(terms.fees)}</dd>
              <dt>{t('Total to repay')}</dt><dd>{formatTzs(terms.totalRepayable)}</dd>
            </dl>
            <fieldset className={s.consents} disabled={!read}>
              <legend className="small" style={{ fontWeight: 700, margin: '14px 0 4px' }}>{t('Declaration and consents')}</legend>
              {CONSENTS.map(([k, sw, en]) => (
                <label key={k} className={s.check}>
                  <input type="checkbox" checked={consents[k]} onChange={(e) => setConsents((c) => ({ ...c, [k]: e.target.checked }))} />
                  <span><b lang="sw">{sw}</b><br /><span className="xs muted" lang="en">{en}</span></span>
                </label>
              ))}
              <label className={s.check}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span><b lang="sw">Nimesoma, nimeelewa na kukubali vifungu vyote vya mkataba huu.</b><br /><span className="xs muted" lang="en">I have read, understood and accept all the terms of this agreement.</span></span>
              </label>
              <TextField label={t('Enter your password to sign')} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mt: 1 }} />
            </fieldset>
            {error && <p className="small" role="alert" style={{ color: 'var(--bad)', fontWeight: 600, margin: '10px 0 0' }}>{error}</p>}
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={!read || !allTicked || !password || busy}>
              {resubmit ? t('Sign and resubmit') : t('Sign agreement and submit')}
            </Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={onBack}>{t('Back')}</Button>
            <p className="xs muted" style={{ marginTop: 12 }}>
              {t('Signing records your name, time, IP address and a fingerprint of this exact text. The agreement takes effect when the application gets final approval on these terms. If a reviewer changes the amount or tenor, you accept a revised agreement before the loan is paid. If the application is rejected or withdrawn it becomes void; if it is returned, you sign a new one when you resubmit.')}
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function ApplyWizardPage() {
  const t = useT();
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
    const timer = setTimeout(async () => {
      try {
        const a = await applicationsApi.update(app.id, JSON.parse(body));
        saved.current = body;
        setApp(a);
      } catch {
        /* shown when continuing */
      }
    }, 600);
    return () => clearTimeout(timer);
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
        setError(Object.keys(c.fieldErrors).length ? t('Fill in the required fields.') : c.eligibility[0] || c.checks[0]);
      } else setStep(2);
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !app) return <div className="page"><Alert severity="error">{error}</Alert></div>;
  if (!app || !form) return <p className="muted" role="status">{t('Loading…')}</p>;
  if (!app.editable) {
    return (
      <div className="page">
        <Alert severity="info" action={<Button component={RouterLink} to={`/applications/${app.id}`}>{t('View application')}</Button>}>{t('{ref} is {status}. It can no longer be changed.', { ref: app.ref, status: t(app.statusLabel).toLowerCase() })}</Alert>
      </div>
    );
  }

  const correcting = app.status === 'returned';
  const title = correcting ? t('Correct {ref}', { ref: app.ref }) : t('Apply for a loan');

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}>
        <RouterLink to="/" style={{ color: 'inherit' }}>{t('Home')}</RouterLink> / {correcting ? <><RouterLink to={`/applications/${app.id}`} style={{ color: 'inherit' }}>{app.ref}</RouterLink> / </> : null}{title}
      </div>
      <div className="pagehead">
        <div>
          <h1>{title}</h1>
          <p>{correcting ? t('Make the changes asked for, then resubmit. It goes back to the first review stage.') : `${app.ref}. ${t('Your details fill in from your profile. You only add the loan request.')}`}</p>
        </div>
        {!correcting && <Button variant="text" onClick={async () => { await applicationsApi.withdraw(app.id, 'Draft cancelled').catch(() => {}); navigate('/'); }}>{t('Cancel application')}</Button>}
      </div>
      <Steps step={step} />
      {error && step < 4 && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {!app.product.available && <Alert severity="error" sx={{ mb: 2 }}>{t('This product is no longer available for new applications.')}</Alert>}
      {step === 1 && <DetailsStep app={app} form={form} setForm={setForm} errors={app.checks.fieldErrors} checks={[...app.checks.eligibility, ...app.checks.checks]} busy={busy} onBack={() => navigate(correcting ? `/applications/${app.id}` : '/apply')} onNext={next} onAppChanged={setApp} />}
      {step === 2 && <DocumentsStep app={app} onChanged={load} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <ReviewStep app={app} form={form} onBack={() => setStep(2)} onNext={() => setStep(4)} onEdit={setStep} />}
      {step === 4 && <SignStep app={app} onBack={() => setStep(3)} onSigned={(a) => navigate(`/applications/${a.id}?submitted=1`)} />}
    </div>
  );
}
