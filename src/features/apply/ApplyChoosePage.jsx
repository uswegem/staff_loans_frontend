// Apply, step 1: choose a loan (prototype wStep0; FR-05). Each product shows its limits
// for this staff member, or why they cannot apply now (profile, NS-02 wait, BR-08). An open
// application of a product blocks a new one, so it is listed here with Continue and, while it
// can still be withdrawn, Withdraw (FR-25) without leaving the page.

import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, Button } from '@mui/material';
import { productsApi } from '../../api/products';
import { profileApi } from '../../api/staff';
import { applicationsApi } from '../../api/applications';
import { apiError } from '../../api/client';
import { Steps } from './ApplyWizardPage';
import LoanFacilityCards from './LoanFacilityCards';
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

  // Rates and fees on the cards come from the live pricing; the cards work without it.
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
      <LoanFacilityCards
        products={products}
        pricing={pricing}
        reasonFor={reasonFor}
        openFor={openFor}
        selected={selected}
        busy={busy}
        onChoose={choose}
      />
      {withdrawing && <WithdrawDialog app={withdrawing} onClose={() => setWithdrawing(null)} onConfirm={withdraw} />}
      <p className={s.helper}><InfoIcon />{t('Your own maximum is worked out from the payslip you attach on the next step.')}</p>
    </div>
  );
}

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.5v.5" /></svg>
);
