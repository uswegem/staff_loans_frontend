// Apply, step 1: choose a loan (prototype wStep0; FR-05). Each product shows its limits
// for this staff member, or why they cannot apply now (profile, NS-02 wait, BR-08). An open
// application of a product blocks a new one, so it is listed here with Continue and, while it
// can still be withdrawn, Withdraw (FR-25) without leaving the page.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, Button } from '@mui/material';
import { productsApi } from '../../api/products';
import { profileApi } from '../../api/staff';
import { applicationsApi } from '../../api/applications';
import { apiError } from '../../api/client';
import { formatNumber } from '../../lib/format';
import { pct } from '../../lib/dates';
import { Steps } from './ApplyWizardPage';
import s from './apply.module.css';
import ApplyBlockers from '../../components/ApplyBlockers';
import WithdrawDialog from '../../components/WithdrawDialog';
import { useT } from '../../i18n';
import { plural } from '../../lib/plural';
import { statusLabel } from '../../lib/statuses';

export default function ApplyChoosePage() {
  const t = useT();
  const navigate = useNavigate();
  const [products, setProducts] = useState(null);
  const [elig, setElig] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState([]);
  const [withdrawing, setWithdrawing] = useState(null);
  const [notice, setNotice] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(
    () =>
      Promise.all([productsApi.live(), profileApi.eligibility(), applicationsApi.list()])
        .then(([p, e, apps]) => {
          setProducts(p);
          setElig(e);
          setMine(apps);
        })
        .catch((err) => setError(apiError(err).message)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  // The interest rate on each card comes from the live pricing; the cards work without it.
  useEffect(() => {
    productsApi.livePricing().then(setPricing).catch(() => {});
  }, []);

  const withdraw = async (reason) => {
    const app = withdrawing;
    try {
      await applicationsApi.withdraw(app.id, reason);
      setWithdrawing(null);
      setError(null);
      setNotice(t('{ref} is withdrawn. You can apply for {product} again.', { ref: app.ref, product: app.product }));
      await load();
    } catch (err) {
      setWithdrawing(null);
      setError(apiError(err).message);
      await load();
    }
  };

  const choose = async (p) => {
    setSelected(p.id);
    setBusy(true);
    setError(null);
    try {
      const app = await applicationsApi.create(p.id);
      navigate(`/apply/${app.id}`);
    } catch (err) {
      setError(apiError(err).message);
      setSelected(null);
      setBusy(false);
    }
  };

  if (error && !products) return <div className="page"><Alert severity="error">{error}</Alert></div>;
  if (!products || !elig) return <p className="muted" role="status">{t('Loading…')}</p>;

  if (!elig.profile.complete) {
    return (
      <div className="page">
        <div className="pagehead"><div><h1>{t('Apply for a loan')}</h1></div></div>
        <Alert severity="warning" action={<Button variant="contained" size="small" component={RouterLink} to="/profile">{t('Complete profile')}</Button>}>
          <AlertTitle>{t('Complete your profile first')}</AlertTitle>
          {t('Every application fills in from your profile, so all required details must be there.')} {t(plural(elig.profile.missing.length, '{n} detail left.', '{n} details left.'), { n: elig.profile.missing.length })}
        </Alert>
      </div>
    );
  }

  if (elig.blockers?.some((reason) => /joining date|date joined/i.test(reason))) {
    return <div className="page"><h1>{t('Apply for a loan')}</h1><Alert severity="warning" action={<Button variant="contained" component={RouterLink} to="/profile?tab=employment">{t('Update Date Joined')}</Button>}><AlertTitle>{t('Profile Update Required')}</AlertTitle>{t('Your employment joining date is missing from your staff profile. Please enter your Date Joined before applying for a staff loan.')}</Alert></div>;
  }

  const openApps = mine.filter((a) => a.open);
  const openFor = (p) => openApps.find((a) => a.productId === p.id);
  const reasonFor = (p) => {
    const o = openFor(p);
    if (o) return t('Open application {ref}', { ref: o.ref });
    return elig.products.find((x) => x.productId === p.id)?.reasons?.[0];
  };
  // Drafts and returned applications continue in the wizard; the rest open their status page.
  const continuePath = (a) => (['draft', 'returned'].includes(a.status) ? `/apply/${a.id}` : `/applications/${a.id}`);

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><RouterLink to="/" style={{ color: 'inherit' }}>{t('Home')}</RouterLink>{' '}{t('/ Apply for a loan')}</div>
      <div className="pagehead">
        <div>
          <h1>{t('Apply for a loan')}</h1>
          <p>{t('Your details fill in from your profile. You only add the loan request.')}</p>
        </div>
      </div>
      <Steps step={0} />
      {elig.blockers?.length > 0 && <div style={{ marginBottom: 16 }}><ApplyBlockers blockers={elig.blockers} /></div>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {openApps.map((a) => (
        <Alert
          key={a.id}
          severity="warning"
          sx={{ mb: 2, alignItems: 'center' }}
          action={
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Button size="small" variant="contained" component={RouterLink} to={continuePath(a)}>{a.status === 'draft' || a.status === 'returned' ? t('Continue it') : t('View')}</Button>
              {a.withdrawable && <Button size="small" variant="text" onClick={() => setWithdrawing(a)}>{t('Withdraw')}</Button>}
            </div>
          }
        >
          <AlertTitle sx={{ mb: 0 }}>{t('Open {product} application {ref}', { product: a.product, ref: a.ref })}</AlertTitle>
          {statusLabel(a.status, a.statusLabel)}. {a.withdrawable ? t('Finish it, or withdraw it to start a new one.') : t('It can no longer be withdrawn.')}
        </Alert>
      ))}
      <LoanCards
        products={products}
        reasonFor={reasonFor}
        openFor={openFor}
        selected={selected}
        busy={busy}
        interestBps={pricing?.interestBps}
        onChoose={choose}
      />
      {withdrawing && <WithdrawDialog app={withdrawing} onClose={() => setWithdrawing(null)} onConfirm={withdraw} />}
      <p className={s.helper}><InfoIcon />{t('Your own maximum is worked out from the payslip you attach on the next step.')}</p>
    </div>
  );
}

const isCarLoan = (p) => /\b(car|vehicle|motor)\b/i.test(`${p.name} ${p.payslipLabel || ''}`);

/**
 * The loan choice as a radio group (WAI-ARIA radio pattern, roving focus): arrow keys move
 * between the loans that can be chosen; Space, Enter or a click chooses one, which marks it
 * selected and starts the application.
 */
function LoanCards({ products, reasonFor, openFor, selected, busy, interestBps, onChoose }) {
  const t = useT();
  const refs = useRef({});
  const enabled = products.filter((p) => !reasonFor(p));
  const [focusId, setFocusId] = useState(null);
  const tabStop = selected || (enabled.some((p) => p.id === focusId) ? focusId : enabled[0]?.id);

  const move = (from, step) => {
    if (!enabled.length) return;
    const i = enabled.findIndex((p) => p.id === from);
    const next = enabled[(i + step + enabled.length) % enabled.length];
    setFocusId(next.id);
    refs.current[next.id]?.focus();
  };

  const onKeyDown = (e, p) => {
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) { e.preventDefault(); move(p.id, 1); }
    else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) { e.preventDefault(); move(p.id, -1); }
    else if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); if (!busy && !reasonFor(p)) onChoose(p); }
  };

  return (
    <div role="radiogroup" aria-label={t('Choose a loan')} className={s.prods}>
      {products.map((p) => {
        const reason = reasonFor(p);
        const disabled = !!reason || busy;
        const checked = selected === p.id;
        return (
          <div
            key={p.id}
            ref={(el) => { refs.current[p.id] = el; }}
            role="radio"
            aria-checked={checked}
            aria-disabled={disabled}
            aria-describedby={reason ? `why_${p.id}` : undefined}
            tabIndex={!reason && p.id === tabStop ? 0 : -1}
            className={`${s.prod} ${checked ? s.prodOn : ''}`}
            onClick={() => !disabled && onChoose(p)}
            onKeyDown={(e) => onKeyDown(e, p)}
            onFocus={() => setFocusId(p.id)}
          >
            <div className={s.prodHead}>
              <span className={s.badge} aria-hidden="true">{isCarLoan(p) ? <CarIcon /> : <WalletIcon />}</span>
              <span className={s.pick} aria-hidden="true">{checked && <CheckIcon />}</span>
            </div>
            <h3>{p.name}</h3>
            {interestBps != null && <div className={s.sub}>{t('{rate} p.a. • Reducing balance', { rate: pct(interestBps) })}</div>}
            <dl className={s.meta}>
              <div><dt>{t('Loan Range')}</dt><dd>{t('TZS {min} – {max}', { min: formatNumber(p.minAmount), max: formatNumber(p.maxAmount) })}</dd></div>
              <div><dt>{t('Tenure')}</dt><dd>{t('{min} – {max} months', { min: p.minTenor, max: p.maxTenor })}</dd></div>
            </dl>
            <div className={s.prodFoot}>
              {reason
                ? (openFor(p)
                  ? <span id={`why_${p.id}`} className="tag">{reason}</span>
                  : <span id={`why_${p.id}`} className={s.reason}>{reason}</span>)
                : <span className={s.cue} aria-hidden="true">{checked && busy ? t('Starting…') : t('Select loan →')}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const svg = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', focusable: 'false' };
const CarIcon = () => (
  <svg {...svg}><path d="M5 17h14v-5l-2-5H7l-2 5v5z" /><path d="M5 12h14" /><circle cx="8" cy="17" r="1.6" /><circle cx="16" cy="17" r="1.6" /></svg>
);
const WalletIcon = () => (
  <svg {...svg}><path d="M4 7h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" /><path d="M4 7l11-3v3" /><path d="M16 13h2" /></svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.5v.5" /></svg>
);
