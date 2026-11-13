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
import { formatNumber } from '../../lib/format';
import { Steps } from './ApplyWizardPage';
import s from './apply.module.css';
import ApplyBlockers from '../../components/ApplyBlockers';
import WithdrawDialog from '../../components/WithdrawDialog';
import { useT } from '../../i18n';

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
    setBusy(true);
    setError(null);
    try {
      const app = await applicationsApi.create(p.id);
      navigate(`/apply/${app.id}`);
    } catch (err) {
      setError(apiError(err).message);
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
          {t('Every application fills in from your profile, so all required details must be there.')} {t('Missing: {list}.', { list: elig.profile.missing.map((m) => t(m.label)).join(', ') })}
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
    if (o) return t('You already have an open {a} application ({b}). Finish or withdraw it first.', { a: p.name, b: o.ref });
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
        <Button variant="text" component={RouterLink} to="/">{t('Cancel')}</Button>
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
              <Button size="small" variant="outlined" color="inherit" component={RouterLink} to={continuePath(a)}>{a.status === 'draft' || a.status === 'returned' ? t('Continue it') : t('View')}</Button>
              {a.withdrawable && <Button size="small" variant="contained" color="warning" onClick={() => setWithdrawing(a)}>{t('Withdraw')}</Button>}
            </div>
          }
        >
          <AlertTitle sx={{ mb: 0 }}>{t('Open {product} application {ref}', { product: a.product, ref: a.ref })}</AlertTitle>
          {t(a.statusLabel)}. {a.withdrawable ? t('Finish it, or withdraw it to start a new one.') : t('It can no longer be withdrawn.')}
        </Alert>
      ))}
      <div className={s.prods}>
        {products.map((p) => {
          const reason = reasonFor(p);
          return (
            <button key={p.id} type="button" className={s.prod} disabled={!!reason || busy} onClick={() => choose(p)} aria-describedby={reason ? `why_${p.id}` : undefined}>
              <span className={s.mark} />
              <h3>{p.name}</h3>
              <div className="muted small">{p.description}</div>
              <div className={s.lim}>
                TZS {formatNumber(p.minAmount)} to TZS {formatNumber(p.maxAmount)}
                <br />
                {p.minTenor} to {p.maxTenor} months
              </div>
              {reason && <div id={`why_${p.id}`} className={s.reason}>{reason}</div>}
            </button>
          );
        })}
      </div>
      {withdrawing && <WithdrawDialog app={withdrawing} onClose={() => setWithdrawing(null)} onConfirm={withdraw} />}
      <p className="xs muted" style={{ marginTop: 16 }}>{t('Your own maximum is worked out from the payslip you attach on the next step: up to half of your Basic Pay after pension and PAYE, plus your LFB deductions, a month. Tenor ranges are sample values until confirmed from the Staff Loan Policy.')}</p>
    </div>
  );
}
