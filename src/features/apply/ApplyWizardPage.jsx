// Apply wizard (prototype wStep1 to wStep4; FR-05 to FR-12, FR-33 to FR-35).
// Step 2 details with the live calculator, step 3 documents, step 4 review, step 5
// read and sign the agreement. Signing submits; there is no other way to submit.

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, Checkbox, FormControlLabel, MenuItem, Slider, TextField, Portal, useMediaQuery } from '@mui/material';
import { applicationsApi } from '../../api/applications';
import { apiError } from '../../api/client';
import { quote as calcQuote, roomInputs } from '../../lib/calc/loanCalculator';
import { todayEat } from '../../lib/dates';
import { formatNumber, formatTzs, formatDate, formatDay } from '../../lib/format';
import MoneyInput from '../../components/MoneyInput';
import LoanRoute from '../../components/LoanRoute';
import StepTransition from '../../components/ux/StepTransition';
import LoadingSkeleton from '../../components/ux/LoadingSkeleton';
import CalculatorPanel, { Breakdown } from './CalculatorPanel';
import CardHeader from '../../components/CardHeader';
import FactList from '../../components/FactList';
import PayslipCard from './PayslipCard';
import AgreementDoc, { ACCEPT_LINE, DeclarationChecks, declarationsOf } from './AgreementDoc';
import { FileList } from '../../components/SupportingDocuments';
import FileDrop from '../../components/FileDrop';
import s from './apply.module.css';
import { useT } from '../../i18n';
import { needsDocuments } from '../../lib/products';
import { plural } from '../../lib/plural';
import DateField from '../../components/fields/DateField';
import { statusLabel } from '../../lib/statuses';

const STEPS = ['Choose a loan', 'Loan details', 'Documents', 'Review', 'Sign and submit'];

export function Steps({ step, hasDocuments = true, reference }) {
  const t = useT();
  const steps = (
    <ol className={s.steps} aria-label={t('Application steps')}>
      {STEPS.map((label, i) => ({ label, i })).filter(({ i }) => hasDocuments || i !== 2).map(({ label, i }) => (
        <li key={label} className={i === step ? s.on : i < step ? s.done : undefined} aria-current={i === step ? 'step' : undefined}>
          {t(label)}
        </li>
      ))}
    </ol>
  );
  if (!reference) return steps;
  // The draft's reference sits quietly beside the steps rather than leading the page.
  return (
    <div className={s.stepsRow}>
      {steps}
      <span className="xs muted">{t('Reference {ref}', { ref: reference })}</span>
    </div>
  );
}

const CONSENTS = [
  ['truth', 'Ninathibitisha kwamba taarifa zote nilizotoa katika maombi haya ni sahihi na kamili.', 'I confirm that all the information in this application is true and complete.'],
  ['deduct', 'Ninaruhusu Mkopeshaji kukata marejesho ya mkopo kwenye mshahara wangu.', 'I authorise the lender to recover repayments from my salary or my account, as I chose.'],
  ['crb', 'Ninaruhusu taarifa zangu za mkopo kuangaliwa na kuwasilishwa kwa ofisi za kumbukumbu za mikopo.', 'I consent to my credit information being checked with, and reported to, credit reference bureaus.'],
  ['sms', 'Ninakubali kupokea ujumbe mfupi (SMS) kuhusu salio, malipo na malimbikizo ya mkopo huu.', "I agree to receive SMS about this loan's balance, payments and arrears."],
];

/**
 * Top-up starts ticked when the payslip shows a deduction for this product. Other products'
 * deductions never count. A running Staff Loans loan alone does not either: the API allows a
 * top-up only of a deduction on the payslip (D-101), so ticking it would only show an error.
 */
const canDefaultTopUp = (app) => !!app.product?.topUpAllowed && (app.deductions?.ownLines || []).length > 0;

/**
 * The form for an application. Until the staff member ticks or unticks top-up themselves
 * (topUp.chosen), it is ticked by default when canDefaultTopUp; after, their choice is kept.
 * withDefault false gives the values as the API holds them.
 */
function formOf(app, withDefault = true) {
  const chosen = !!app.topUp?.chosen;
  return {
    amount: app.amount,
    tenor: app.tenor,
    purpose: app.purpose || '',
    productFields: app.productFields || {},
    topUp: { on: chosen ? !!app.topUp.on : !!app.topUp?.on || (withDefault && canDefaultTopUp(app)), chosen, payslipLine: app.topUp?.payslipLine?.label ? app.topUp.payslipLine : null },
    probationReason: app.probation?.reason || '',
  };
}

function bodyOf(form, app) {
  const body = {
    amount: form.amount ?? null,
    tenor: form.tenor ?? null,
    purpose: form.purpose,
    productFields: form.productFields,
    topUp: form.topUp.on ? { on: true, chosen: !!form.topUp.chosen, payslipLine: form.topUp.payslipLine || null } : { on: false, chosen: !!form.topUp.chosen },
  };
  if (app.probation.onProbation) body.probationReason = form.probationReason;
  return body;
}

/** The payslip line being topped up (D-101): the only one of this product, or the one chosen. */
function topUpLineOf(d, form) {
  if (!form.topUp.on) return -1;
  if (d.ownLines.length === 1) return d.ownLines[0];
  const c = form.topUp.payslipLine;
  return c ? d.ownLines.find((i) => d.lines[i].label === c.label && d.lines[i].amount === c.amount) ?? -1 : -1;
}

/**
 * Room inputs (D-101), as the API works them out: the payslip's staff loan deductions (less
 * the line topped up) and the SLAS loans not yet on the payslip (less the one topped up).
 */
function roomFor(app, form) {
  const d = app.deductions || { lines: [], ownLines: [], slas: [] };
  return roomInputs({ lines: d.lines, topUpLine: topUpLineOf(d, form), slas: d.slas, topUpLoanId: form.topUp.on ? d.topUpCandidate?.applicationId : null });
}

/** The same calculation as the API, for instant feedback while typing. */
function eligibleTenor(app) {
  return Math.max(0, Math.min(app.product.maxTenor, app.retirement?.maxTenor ?? app.product.maxTenor, app.quote?.maxTenor ?? app.product.maxTenor));
}

function liveQuote(app, form) {
  return calcQuote({
        amount: form.amount || 0,
        tenor: form.tenor || 0,
        topUp: form.topUp.on,
        pay: app.payInputs,
        existing: roomFor(app, form),
        pricing: app.pricing,
        startDay: todayEat(),
        dueDay: app.firstDueDay,
        maxTenor: eligibleTenor(app),
        maxAmountCap: app.product.maxAmount,
      });
}

function useLiveQuote(app, form) {
  return useMemo(() => liveQuote(app, form), [app, form]);
}

// Preserve saved requests and manual edits; only untouched fields follow the available maximum.
function applyDefaults(app, form, manual) {
  const maxTenor = eligibleTenor(app);
  const tenor = manual.tenor ? form.tenor : maxTenor >= app.product.minTenor ? maxTenor : null;
  const next = { ...form, tenor };
  const maximum = app.payslip ? liveQuote(app, next).maxAmountAtTenor : app.product.maxAmount;
  const amount = manual.amount ? form.amount : maximum >= app.product.minAmount ? Math.min(app.product.maxAmount, maximum) : null;
  return { ...next, amount };
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
  if (f.type === 'date') return <DateField {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  return (
    <TextField
      {...common}
      type={f.type === 'number' ? 'number' : 'text'}
      multiline={f.type === 'textarea'}
      minRows={f.type === 'textarea' ? 3 : undefined}
      value={value ?? ''}
      onChange={(e) => onChange(f.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
    />
  );
}

const same = (a, b) => (a ?? null) === (b ?? null) || (a ?? '') === (b ?? '');

/**
 * The API's field errors (the one set of rules), shown progressively: a field's error appears
 * once the field has been left or Continue was pressed, and hides while its value differs from
 * the one the API last checked, so a correction clears the error straight away.
 */
function useShownErrors(app, form, errors, attempted) {
  const [touched, setTouched] = useState({});
  const saved = {
    amount: app.amount,
    tenor: app.tenor,
    purpose: app.purpose,
    probationReason: app.probation?.reason,
    'topUp.on': app.topUp?.on,
    'topUp.payslipLine': app.topUp?.payslipLine?.label ? `${app.topUp.payslipLine.label}|${app.topUp.payslipLine.amount}` : null,
    ...Object.fromEntries(Object.entries(form.productFields).map(([k]) => [`productFields.${k}`, app.productFields?.[k]])),
  };
  const current = { amount: form.amount, tenor: form.tenor, purpose: form.purpose, probationReason: form.probationReason, 'topUp.on': form.topUp.on, 'topUp.payslipLine': form.topUp.payslipLine ? `${form.topUp.payslipLine.label}|${form.topUp.payslipLine.amount}` : null, ...Object.fromEntries(Object.entries(form.productFields).map(([k, v]) => [`productFields.${k}`, v])) };
  const shown = (key) => ((attempted || touched[key]) && same(current[key], saved[key]) ? errors[key] : undefined);
  const touch = (key) => () => setTouched((x) => (x[key] ? x : { ...x, [key]: true }));
  return { shown, touch, touched };
}

function DetailsStep({ app, form, setForm, errors, checks, checked, saveFailure, onRetry, onBack, onNext, busy, onAppChanged, attempt, onManual }) {
  const t = useT();
  const p = app.product;
  const q = useLiveQuote(app, form);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const formRef = useRef(null);
  const attempted = attempt > 0;
  const { shown, touch, touched } = useShownErrors(app, form, errors, attempted);
  const ded = app.deductions || { lines: [], ownLines: [] };
  const ownLines = ded.ownLines.map((i) => ded.lines[i]);
  // D-82: the longest tenor that ends on or before the retirement cutoff (backend figure).
  const r = app.retirement || {};
  const maxTenor = eligibleTenor(app);
  const maxAmount = app.payslip ? Math.min(p.maxAmount, q.maxAmountAtTenor) : p.maxAmount;
  const amountRange = maxAmount < p.minAmount ? t('Your eligible amount is below the product minimum of TZS {min}.', { min: formatNumber(p.minAmount) }) : form.amount != null && (form.amount > maxAmount || form.amount < p.minAmount) ? t('Choose an amount between TZS {min} and TZS {max}.', { min: formatNumber(p.minAmount), max: formatNumber(maxAmount) }) : null;
  // The maximum for the tenor chosen (the figure that matters now); the longest-tenor one until then.
  const hint = !app.payslip
    ? t('TZS {min} to TZS {max}; attach your payslip to see your maximum', { min: formatNumber(p.minAmount), max: formatNumber(p.maxAmount) })
    : form.tenor && q.maxAmountAtTenor
      ? t('Up to TZS {max} over {n} months', { max: formatNumber(q.maxAmountAtTenor), n: form.tenor })
      : t('TZS {min} to TZS {max} (up to {n} months)', { min: formatNumber(p.minAmount), max: formatNumber(q.maxAmount), n: q.maxTenor });
  // The tenor range in context, once the tenor has been changed (the API checks it too).
  const tenorRange = (touched.tenor || attempted) && form.tenor
    ? form.tenor > maxTenor ? t('The longest tenor you can take is {n} months.', { n: maxTenor }) : form.tenor < p.minTenor ? t('Choose a tenor between {min} and {max} months.', { min: p.minTenor, max: maxTenor }) : null
    : null;
  const tenorError = shown('tenor') || (maxTenor < p.minTenor ? t('Your eligible tenor is below the product minimum.') : tenorRange);
  const continueLabel = needsDocuments(p) ? t('Continue to documents') : t('Continue');
  const phone = useMediaQuery('(max-width:600px)');
  // A problem with an attached payslip (too old, unreadable) shows at once; a missing one only on Continue.
  const payslipError = app.payslip || attempted ? errors.payslip : undefined;

  // After a Continue that found problems: bring the first one into view.
  useEffect(() => {
    if (!attempt) return;
    const first = formRef.current?.querySelector('[aria-invalid="true"], [data-invalid="true"]');
    if (first) {
      first.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      first.focus({ preventScroll: true });
    }
  }, [attempt]);

  return (
    <div className={`${s.split} ${phone ? s.withMobileBar : ''}`}>
      <Card>
        <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
          <h3>{p.name}</h3>
        </div>
        <form ref={formRef} style={{ padding: 24 }} noValidate onSubmit={(e) => { e.preventDefault(); onNext(); }}>
          <PayslipCard app={app} error={payslipError} onChanged={onAppChanged} />
          {/* Only when the retirement cutoff shortens the tenor: otherwise it changes nothing for them. */}
          {r.cutoff && maxTenor < p.maxTenor && (
            <div className={s.note}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
              <span>
                {t('You can take up to')} <b>{t('{n} months', { n: maxTenor })}</b>{maxTenor < p.maxTenor ? ` ${t('(the product allows {n})', { n: p.maxTenor })}` : ''}. {t('Your last instalment must fall on or before')}{' '}<b>{formatDate(r.cutoff)}</b> {t('({n} days before you turn {age}, from your verified date of birth).', { n: r.bufferDays, age: r.age })}
              </span>
            </div>
          )}
          <div className={s.grid}>
            <MoneyInput label={t('Amount')} required placeholder={t('Enter amount')} value={form.amount ?? null} onChange={(v) => { onManual('amount'); set({ amount: v }); }} onBlur={touch('amount')} error={!!(shown('amount') || amountRange)} helperText={shown('amount') || amountRange || hint} />
            <div>
              <TextField label={t('Tenor (months)')} required type="number" value={form.tenor ?? ''} onChange={(e) => { onManual('tenor'); set({ tenor: e.target.value === '' ? null : Number(e.target.value) }); }} onBlur={touch('tenor')} error={!!tenorError} helperText={tenorError || t('{min} to {max} months', { min: p.minTenor, max: maxTenor })} inputProps={{ min: p.minTenor, max: maxTenor, inputMode: 'numeric' }} />
              <Slider aria-label={t('Tenor slider')} min={p.minTenor} max={Math.max(p.minTenor, maxTenor)} disabled={maxTenor < p.minTenor} value={Math.max(p.minTenor, Math.min(maxTenor, form.tenor || p.minTenor))} onChange={(_, v) => { onManual('tenor'); set({ tenor: v }); }} onChangeCommitted={touch('tenor')} sx={{ color: 'var(--strong)' }} />
            </div>
            <TextField label={t('Purpose of the loan')} required className={s.full} placeholder={t('What will you use the loan for?')} value={form.purpose} onChange={(e) => set({ purpose: e.target.value })} onBlur={touch('purpose')} error={!!shown('purpose')} helperText={shown('purpose')} />
            {p.fields.map((f) => (
              <div key={f.key} className={f.type === 'textarea' ? s.full : undefined} onBlur={touch(`productFields.${f.key}`)}>
                <FieldInput f={f} value={form.productFields[f.key]} error={shown(`productFields.${f.key}`)} onChange={(v) => set({ productFields: { ...form.productFields, [f.key]: v } })} />
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
                onBlur={touch('probationReason')}
                error={!!shown('probationReason')}
                helperText={shown('probationReason') || t('You are on probation until the date on your profile. People and Culture will verify your reason.')}
              />
            )}
          </div>

          {p.topUpAllowed && (
            <div style={{ marginTop: 12 }}>
              <FormControlLabel
                control={<Checkbox checked={form.topUp.on} onChange={(e) => set({ topUp: { ...form.topUp, on: e.target.checked, chosen: true } })} />}
                label={
                  <span>
                    <b>{t('This tops up an existing staff loan')}</b>
                    <br />
                    <span className="small muted">{t('Its balance is settled from the new loan, and its monthly deduction stops: the new instalment replaces it.')}</span>
                  </span>
                }
              />
              {form.topUp.on && (
                // D-101: the loan topped up is a deduction on the payslip, in Staff Loans or not.
                <div style={{ margin: '4px 0 8px 32px' }}>
                  {!form.topUp.chosen && ownLines.length > 0 && (
                    <p className="small muted" style={{ margin: '0 0 8px' }}>{t('Ticked because your payslip shows a {label} deduction for this product. Untick it if this is a separate loan.', { label: ownLines[0].label })}</p>
                  )}
                  {shown('topUp.on') && <p className="small" role="alert" style={{ color: 'var(--bad)', fontWeight: 600, margin: '0 0 8px' }}>{shown('topUp.on')}</p>}
                  {!app.payslip && <p className="small muted" style={{ margin: 0 }}>{t('Attach your payslip: the deduction being topped up is read from it.')}</p>}
                  {ownLines.length === 1 && (
                    <p className="small" style={{ margin: 0 }}>{t('Topping up the payslip deduction {label}: {amount} a month.', { label: ownLines[0].label, amount: formatTzs(ownLines[0].amount) })}</p>
                  )}
                  {ownLines.length > 1 && (
                    <div className={s.grid}>
                      <TextField
                        select
                        label={t('Payslip deduction being topped up')}
                        value={form.topUp.payslipLine ? `${form.topUp.payslipLine.label}|${form.topUp.payslipLine.amount}` : ''}
                        onChange={(e) => {
                          const l = ownLines.find((x) => `${x.label}|${x.amount}` === e.target.value);
                          set({ topUp: { ...form.topUp, payslipLine: l ? { label: l.label, amount: l.amount } : null } });
                        }}
                        onBlur={touch('topUp.payslipLine')}
                        error={!!shown('topUp.payslipLine')}
                        helperText={shown('topUp.payslipLine') || t('Your payslip shows more than one deduction for this product. The others count as other deductions.')}
                      >
                        {ownLines.map((l, i) => <MenuItem key={`${l.label}|${l.amount}|${i}`} value={`${l.label}|${l.amount}`}>{l.label}: {t('TZS {amount} a month', { amount: formatNumber(l.amount) })}</MenuItem>)}
                      </TextField>
                    </div>
                  )}
                  {ded.topUpCandidate && <p className="xs muted" style={{ margin: '6px 0 0' }}>{t('{ref} in Staff Loans is settled from this loan.', { ref: ded.topUpCandidate.ref })}</p>}
                </div>
              )}
            </div>
          )}

          {!checked && saveFailure ? (
            <Alert severity="warning" sx={{ mt: 2.5 }} action={saveFailure.code === 'NETWORK' || !saveFailure.status || saveFailure.status >= 500 ? <Button size="small" onClick={onRetry}>{t('Try again')}</Button> : undefined}>
              <AlertTitle>{t('Your latest changes are not saved or checked yet')}</AlertTitle>
              {saveFailure.message}
            </Alert>
          ) : checks.length > 0 && form.amount && form.tenor ? (
            // The API's checks for the values it last saw. While newer values are on their way
            // they are marked as being checked again, and replaced as soon as the answer arrives.
            <Alert severity="error" sx={{ mt: 2.5, opacity: checked ? 1 : 0.6 }} aria-busy={!checked}>
              <AlertTitle>{checked ? t('Fix this before you continue') : t('Checking your changes…')}</AlertTitle>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{checks.map((c) => <li key={c}>{c}</li>)}</ul>
            </Alert>
          ) : null}

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 24 }}>
            <Button onClick={onBack}>{t('Back')}</Button>
            {!phone && <Button type="submit" variant="contained" disabled={busy}>{continueLabel}</Button>}
          </div>
          {/* Phones: the instalment and Continue stay in view; the full estimate follows the form. */}
          {/* In a portal: the step transition's transform would otherwise pin it inside the card. */}
          {phone && (
            <Portal>
              <div className={s.mobileBar}>
                <span className="small">{form.amount && form.tenor && app.payslip ? <>{t('Instalment')} <b>{formatTzs(q.instalment)}</b></> : null}</span>
                <Button variant="contained" disabled={busy} onClick={() => formRef.current?.requestSubmit()}>{continueLabel}</Button>
              </div>
            </Portal>
          )}
        </form>
      </Card>
      <Card className={s.sticky}>
        <CalculatorPanel q={q} amount={form.amount} tenor={form.tenor} topUp={form.topUp.on} hasPayslip={!!app.payslip} deductions={app.deductions && { ...app.deductions, topUpLine: topUpLineOf(app.deductions, form) }} />
      </Card>
    </div>
  );
}

function DocumentsStep({ app, onChanged, onBack, onNext }) {
  const t = useT();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // Missing documents are flagged only after Review application is pressed, not on arrival.
  const [tried, setTried] = useState(false);
  const requirements = (app.product?.requiredDocuments || []).filter((d) => d.active !== false).sort((a, b) => a.displayOrder - b.displayOrder);
  const filesFor = (d) => app.documents.filter((f) => String(f.documentCode || '').trim().toLowerCase() === String(d.code || '').trim().toLowerCase());
  const validFiles = (d) => filesFor(d).filter((f) => f.size <= d.maxFileMb * 1024 * 1024 && (d.allowedTypes || []).some((type) => String(type).toLowerCase().replace('jpeg', 'jpg') === ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' })[f.mime]));
  const missing = requirements.filter((d) => d.mandatory && validFiles(d).length < d.minFiles);
  const add = async (files, category) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of [...files]) {
        // eslint-disable-next-line no-await-in-loop
        await applicationsApi.addDocument(app.id, file, category?.name, category?.code);
      }
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
      onChanged();
    }
  };
  const remove = async (d) => {
    try {
      setError(null);
      await applicationsApi.removeDocument(app.id, d.id);
      onChanged();
    } catch (err) {
      setError(apiError(err).message);
    }
  };
  /** "Add at least 1 file (up to 4)" before an upload; "1 file added ✓ (up to 4)" after. */
  const slotStatus = (d) => {
    const n = validFiles(d).length;
    if (!n) return t(plural(d.minFiles || 1, 'Add at least {min} file (up to {max})', 'Add at least {min} files (up to {max})'), { min: d.minFiles || 1, max: d.maxFiles });
    return t(plural(n, '{n} file added ✓ (up to {max})', '{n} files added ✓ (up to {max})'), { n, max: d.maxFiles });
  };
  // What is still needed, in one sentence: "Add Invoice and Photos of the car to continue."
  const needed = missing.length ? t('Add {list} to continue.', { list: missing.map((d) => d.name).join(t(' and ')) }) : null;
  const next = () => {
    setTried(true);
    if (!missing.length) onNext();
  };
  return (
    <Card>
      <div style={{ padding: 24, borderBottom: '1px solid var(--line-2)' }}>
        <h3>{t('Supporting documents')}</h3>
        <p className="small muted">{t('Upload the supporting documents required for this loan product.')}</p>
      </div>
      <div style={{ padding: 24 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {requirements.map((d) => {
          const uploaded = filesFor(d);
          const short = tried && d.mandatory && validFiles(d).length < d.minFiles;
          return (
            <div key={d.code} style={{ marginBottom: 20, padding: 16, border: `1px solid ${short ? 'var(--bad)' : 'var(--line-2)'}`, borderRadius: 8 }}>
              <h4>{d.name} {d.mandatory ? '*' : ''}</h4>
              {d.description && <p className="small muted">{d.description}</p>}
              <p className="xs" style={{ fontWeight: 600 }}>{slotStatus(d)}</p>
              {uploaded.length < d.maxFiles && <FileDrop accept={(d.allowedTypes || []).map((x) => '.' + x).join(',')} label={d.name} busy={busy} onFile={(file) => add([file], d)} />}
              <FileList files={uploaded} onRemove={remove} />
              {short && <p className="xs" role="alert" style={{ color: 'var(--bad)', margin: '8px 0 0' }}>{t('Required document missing')}</p>}
            </div>
          );
        })}
        {!requirements.length && (
          <div>
            <p className="small muted">{t('No additional supporting documents are configured for this product.')}</p>
            <FileDrop accept=".pdf,.jpg,.jpeg,.png" label={t('Other supporting documents')} busy={busy} onFile={(file) => add([file])} />
            <FileList files={app.documents} onRemove={remove} />
          </div>
        )}
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 24, alignItems: 'flex-start' }}>
          <Button onClick={onBack}>{t('Back')}</Button>
          <div style={{ textAlign: 'right' }}>
            <Button variant="contained" disabled={busy} onClick={next}>{t('Review application')}</Button>
            {needed && <p className="xs" style={{ margin: '6px 0 0', color: tried ? 'var(--bad)' : 'var(--ink-3)' }}>{needed}</p>}
          </div>
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
            {form.topUp.on && (() => {
              const d = app.deductions || { lines: [], ownLines: [] };
              const line = d.lines[topUpLineOf(d, form)];
              return (<><dt>{t('Top-up of')}</dt><dd>{line ? `${line.label}, ${t('{amount} a month', { amount: formatTzs(line.amount) })}` : '—'}{d.topUpCandidate ? ` (${d.topUpCandidate.ref})` : ''}</dd></>);
            })()}
            {app.probation.onProbation && (<><dt>{t('Probation reason')}</dt><dd>{form.probationReason}</dd></>)}
          </dl>
        </Card>
        {(needsDocuments(p) || app.documents.length > 0) && (
          <Card>
            <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
              <h3>{t('Documents')}</h3>
              {needsDocuments(p) && <Button size="small" variant="text" onClick={() => onEdit(2)}>{t('Edit')}</Button>}
            </div>
            <div className="small" style={{ padding: 24 }}>{app.documents.length ? app.documents.map((d) => <div key={d.id}>{d.originalName}</div>) : <span className="muted">{t('None attached')}</span>}</div>
          </Card>
        )}
        <Card>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}><h3>{t('What happens next')}</h3></div>
          <div style={{ padding: 24 }}>
            <LoanRoute app={draftRoute} />
            <p className="small muted" style={{ marginTop: 12 }}>{t('Each reviewer has a working-hours target. You can follow every step and get an in-app notification when it moves.')}</p>
          </div>
        </Card>
      </div>
      <Card className={s.sticky}>
        {/* A short summary: the full estimate was on the details step and stays one click away. */}
        <CardHeader title={t('Your loan estimate')} />
        <div style={{ padding: 24 }}>
          <FactList rows={[
            [t('Monthly instalment'), formatTzs(q.instalment)],
            [t('Total to repay'), formatTzs(q.totalRepayable)],
            [t('Fees'), formatTzs((q.processingFee || 0) + (q.insuranceFee || 0))],
            [t('First instalment'), q.firstDueDate ? formatDay(q.firstDueDate) : null],
          ]}
          />
          <details style={{ marginTop: 12 }}>
            <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>{t('How your limit is worked out')}</summary>
            <div style={{ marginTop: 8 }}><Breakdown q={q} deductions={app.deductions && { ...app.deductions, topUpLine: topUpLineOf(app.deductions, form) }} topUp={form.topUp.on} /></div>
          </details>
        </div>
        <div style={{ padding: 24, borderTop: '1px solid var(--line-2)' }}>
          <p className="small muted" style={{ margin: '0 0 12px' }}>{t('Next you read the loan agreement for these terms and sign it. Signing submits the application.')}</p>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Button onClick={onBack}>{t('Back')}</Button>
            <Button variant="contained" onClick={onNext}>{t('Continue to agreement')}</Button>
          </div>
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
  // An agreement with its own declarations is signed by ticking those; otherwise the four standard statements.
  const declared = useMemo(() => declarationsOf(preview?.blocks), [preview]);
  const [ticks, setTicks] = useState([]);
  useEffect(() => setTicks(declared.map(() => false)), [declared]);
  const [agree, setAgree] = useState(false);
  // D-108: the data protection notice has its own box, unticked until the applicant ticks it.
  const [dataProtection, setDataProtection] = useState(false);
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

  const statementsTicked = declared.length ? ticks.length === declared.length && ticks.every(Boolean) : Object.values(consents).every(Boolean);
  const allTicked = statementsTicked && agree && dataProtection;
  const sign = async (e) => {
    e.preventDefault();
    if (!allTicked) return setError(t('Tick every statement and the agreement to sign.'));
    setBusy(true);
    setError(null);
    try {
      const statements = declared.length ? { declarations: ticks } : { consents };
      const done = await applicationsApi.signAndSubmit(app.id, { ...statements, accepted: agree, dataProtection, dataProtectionVersion: preview.dataProtection?.version, scrolledToEnd: read, textSha256: preview.textSha256 });
      onSigned(done);
    } catch (err) {
      const x = apiError(err);
      if (x.code === 'AGREEMENT_CHANGED' || x.code === 'DATA_PROTECTION_CHANGED') {
        setDataProtection(false);
        setRead(false);
        setProgress(0);
        await load();
      }
      setError(x.message);
      setBusy(false);
    }
    return undefined;
  };

  if (!preview) return error ? <Alert severity="error">{error}</Alert> : <p className="muted" role="status">{t('Preparing your agreement…')}</p>;
  const terms = preview.terms;
  // D-109: the agreement, its statements and the notice are in one language, never mixed.
  const lang = preview.language || preview.template.language || 'sw';
  const dp = preview.dataProtection;

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
        {preview.languageNotice && <Alert severity="info" sx={{ mb: 2 }}>{preview.languageNotice}</Alert>}
        <AgreementDoc ref={docRef} blocks={preview.blocks} onScroll={onScroll} lang={lang} />
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
              {declared.length
                ? <DeclarationChecks items={declared} ticks={ticks} onChange={setTicks} lang={lang} />
                : CONSENTS.map(([k, sw, en]) => (
                  <label key={k} className={s.check}>
                    <input type="checkbox" checked={consents[k]} onChange={(e) => setConsents((c) => ({ ...c, [k]: e.target.checked }))} />
                    <span lang={lang}><b>{lang === 'en' ? en : sw}</b></span>
                  </label>
                ))}
              <label className={s.check}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span lang={lang}><b>{ACCEPT_LINE[lang === 'en' ? 'en' : 'sw']}</b></span>
              </label>
              {dp && (
                <div className={s.dataProtection} lang={dp.language} data-testid="data-protection">
                  <p className="small" style={{ fontWeight: 700, margin: '12px 0 4px' }}>{dp.title}</p>
                  {dp.fallbackNotice && <p className="xs muted" style={{ margin: '0 0 4px' }}>{dp.fallbackNotice}</p>}
                  <p className="xs" style={{ margin: '0 0 6px', maxHeight: 160, overflowY: 'auto' }}>{dp.body}</p>
                  <label className={s.check}>
                    <input type="checkbox" checked={dataProtection} onChange={(e) => setDataProtection(e.target.checked)} />
                    <span><b>{dp.checkbox}</b></span>
                  </label>
                </div>
              )}
            </fieldset>
            {error && <p className="small" role="alert" style={{ color: 'var(--bad)', fontWeight: 600, margin: '10px 0 0' }}>{error}</p>}
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 16 }}>
              <Button onClick={onBack}>{t('Back')}</Button>
              <Button type="submit" variant="contained" disabled={!read || !allTicked || busy}>
                {resubmit ? t('Sign and resubmit') : t('Sign agreement and submit')}
              </Button>
            </div>
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
  const [cancelling, setCancelling] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // The body the API last checked: its checks describe exactly these values.
  const saved = useRef(null);
  const manual = useRef({ amount: false, tenor: false });
  const loadedId = useRef(null);
  // Every request that returns the application takes a number; only the latest one is applied,
  // so a slow older answer never replaces the checks for newer values.
  const seq = useRef(0);
  // The body most recently sent: equal to saved while nothing is on its way.
  const sent = useRef(null);
  const [saveFailure, setSaveFailure] = useState(null);
  const [retry, setRetry] = useState(0);

  const load = useCallback(async () => {
    const n = ++seq.current;
    try {
      const a = await applicationsApi.get(id);
      if (n !== seq.current) return;
      setApp(a);
      if (loadedId.current !== id) {
        loadedId.current = id;
        manual.current = { amount: a.amount != null, tenor: a.tenor != null };
        setForm(applyDefaults(a, formOf(a), manual.current));
        setStep(1);
      }
      // What the API holds, without the top-up default, so a default tick is still sent and checked.
      saved.current = JSON.stringify(bodyOf(formOf(a, false), a));
      sent.current = saved.current;
    } catch (err) {
      if (n === seq.current) setError(apiError(err).message);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  // Save while typing (debounced) so the server's checks stay current.
  useEffect(() => {
    if (!app || !form || !app.editable) return undefined;
    const body = JSON.stringify(bodyOf(form, app));
    if (body === sent.current) return undefined;
    const timer = setTimeout(async () => {
      const n = ++seq.current;
      sent.current = body;
      try {
        const a = await applicationsApi.update(app.id, JSON.parse(body));
        if (n !== seq.current) return;
        saved.current = body;
        setApp(a);
        setSaveFailure(null);
      } catch (err) {
        // Not saved, so not checked: say so rather than leave the last checks looking current.
        if (n !== seq.current) return;
        sent.current = saved.current;
        setSaveFailure(apiError(err));
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form, app, retry]);

  // Recalculate untouched amount when tenor or top-up changes, using the existing calculator.
  useEffect(() => {
    if (!app || !form || step !== 1) return;
    const next = applyDefaults(app, form, manual.current);
    if (next.amount !== form.amount || next.tenor !== form.tenor) setForm(next);
  }, [app, form, step]);

  // A Continue message describes the form as it was; editing makes it out of date.
  useEffect(() => setError(null), [form]);

  const saveNow = async () => {
    const n = ++seq.current;
    const body = bodyOf(form, app);
    sent.current = JSON.stringify(body);
    let a;
    try {
      a = await applicationsApi.update(app.id, body);
    } catch (err) {
      if (n === seq.current) sent.current = saved.current;
      throw err;
    }
    if (n === seq.current) {
      saved.current = sent.current;
      setApp(a);
      setSaveFailure(null);
    }
    return a;
  };

  // A payslip upload answers with the application too; it supersedes any save still on its way.
  const payslipRead = (a) => {
    seq.current += 1;
    // A save that was on its way is dropped with its answer: send the latest values again.
    sent.current = saved.current;
    setApp(a);
    // A new payslip can show, or stop showing, this product's deduction: apply the top-up
    // default again, but never over the staff member's own choice.
    setForm((f) => f ? applyDefaults(a, !f.topUp.chosen ? { ...f, topUp: { ...f.topUp, on: canDefaultTopUp(a) } } : f, manual.current) : f);
  };

  const next = async () => {
    setBusy(true);
    setError(null);
    try {
      const a = await saveNow();
      const c = a.checks;
      if (Object.keys(c.fieldErrors).length || c.checks.length || c.eligibility.length) {
        setError(Object.keys(c.fieldErrors).length ? t('Fill in the required fields.') : c.eligibility[0] || c.checks[0]);
        setAttempt((n) => n + 1);
      } else setStep(needsDocuments(a.product) ? 2 : 3);
    } catch (err) {
      setSaveFailure(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const cancelDraft = async () => {
    if (cancelling || !window.confirm(t('Cancel this draft application? This cannot be undone.'))) return;
    setCancelling(true);
    setError(null);
    try {
      await applicationsApi.withdraw(app.id, 'Draft cancelled');
      navigate('/');
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setCancelling(false);
    }
  };

  if (error && !app) return <div className="page"><Alert severity="error">{error}</Alert></div>;
  if (!app || !form) return <div className="page"><LoadingSkeleton label={t('Loading…')} rows={3} /></div>;
  if (!app.editable) {
    return (
      <div className="page">
        <Alert severity="info" action={<Button component={RouterLink} to={`/applications/${app.id}`}>{t('View application')}</Button>}>{t('{ref} is {status}. It can no longer be changed.', { ref: app.ref, status: statusLabel(app.status, app.statusLabel).toLowerCase() })}</Alert>
      </div>
    );
  }

  const correcting = app.status === 'returned';
  // What the reviewer asked for, shown where it is fixed rather than only on the status page.
  const returnedBy = correcting ? [...(app.history || [])].reverse().find((h) => h.action === 'return') : null;
  const returnStage = returnedBy?.stage && app.route?.stages ? app.route.stageLabels?.[app.route.stages.indexOf(returnedBy.stage)] : null;
  const title = correcting ? t('Correct {ref}', { ref: app.ref }) : t('Apply for a loan');

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}>
        <RouterLink to="/" style={{ color: 'inherit' }}>{t('Home')}</RouterLink> / {correcting ? <><RouterLink to={`/applications/${app.id}`} style={{ color: 'inherit' }}>{app.ref}</RouterLink> / </> : null}{title}
      </div>
      <div className="pagehead">
        <div>
          <h1>{title}</h1>
          <p>{correcting ? t('Make the changes asked for, then resubmit. It goes back to the first review stage.') : t('Your details fill in from your profile. You only add the loan request.')}</p>
        </div>
        {!correcting && <Button variant="text" disabled={cancelling} onClick={cancelDraft}>{cancelling ? t('Cancelling…') : t('Cancel application')}</Button>}
      </div>
      <Steps step={step} hasDocuments={needsDocuments(app.product)} reference={correcting ? null : app.ref} />
      {returnedBy?.comment && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>{returnStage ? t('Returned by the {stage} on {date}', { stage: t(returnStage), date: formatDate(returnedBy.at) }) : t('Returned on {date}', { date: formatDate(returnedBy.at) })}</AlertTitle>
          {returnedBy.comment}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {!app.product.available && <Alert severity="error" sx={{ mb: 2 }}>{t('This product is no longer available for new applications.')}</Alert>}
      <StepTransition stepKey={step}>
      {step === 1 && <DetailsStep app={app} form={form} setForm={setForm} errors={app.checks.fieldErrors} checks={[...new Set([...app.checks.eligibility, ...app.checks.checks])]} checked={JSON.stringify(bodyOf(form, app)) === saved.current} saveFailure={saveFailure} onRetry={() => setRetry((n) => n + 1)} busy={busy} attempt={attempt} onBack={() => navigate(correcting ? `/applications/${app.id}` : '/apply')} onNext={next} onAppChanged={payslipRead} onManual={(field) => { manual.current[field] = true; }} />}
      {step === 2 && <DocumentsStep app={app} onChanged={load} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <ReviewStep app={app} form={form} onBack={() => setStep(needsDocuments(app.product) ? 2 : 1)} onNext={() => setStep(4)} onEdit={setStep} />}
      {step === 4 && <SignStep app={app} onBack={() => setStep(3)} onSigned={(a) => navigate(`/applications/${a.id}?submitted=1`)} />}
      </StepTransition>
    </div>
  );
}
