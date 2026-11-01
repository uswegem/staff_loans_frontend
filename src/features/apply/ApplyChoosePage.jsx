// Apply, step 1: choose a loan (prototype wStep0; FR-05). Each product shows its limits
// for this staff member, or why they cannot apply now (profile, NS-02 wait, BR-08).

import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, Button } from '@mui/material';
import { productsApi } from '../../api/products';
import { profileApi } from '../../api/staff';
import { applicationsApi } from '../../api/applications';
import { apiError } from '../../api/client';
import { formatNumber } from '../../lib/format';
import { Steps } from './ApplyWizardPage';
import s from './apply.module.css';

export default function ApplyChoosePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState(null);
  const [elig, setElig] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([productsApi.live(), profileApi.eligibility()])
      .then(([p, e]) => {
        setProducts(p);
        setElig(e);
      })
      .catch((err) => setError(apiError(err).message));
  }, []);

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
  if (!products || !elig) return <p className="muted" role="status">Loading…</p>;

  if (!elig.profile.complete) {
    return (
      <div className="page">
        <div className="pagehead"><div><h1>Apply for a loan</h1></div></div>
        <Alert severity="warning" action={<Button variant="contained" size="small" component={RouterLink} to="/profile">Complete profile</Button>}>
          <AlertTitle>Complete your profile first</AlertTitle>
          Every application fills in from your profile, so all required details must be there. Missing: {elig.profile.missing.map((m) => m.label).join(', ')}.
        </Alert>
      </div>
    );
  }

  const reasonFor = (p) => elig.products.find((x) => x.productId === p.id)?.reasons?.[0];

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><RouterLink to="/" style={{ color: 'inherit' }}>Home</RouterLink> / Apply for a loan</div>
      <div className="pagehead">
        <div>
          <h1>Apply for a loan</h1>
          <p>Your details fill in from your profile. You only add the loan request.</p>
        </div>
        <Button variant="text" component={RouterLink} to="/">Cancel</Button>
      </div>
      <Steps step={0} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
      <p className="xs muted" style={{ marginTop: 16 }}>Your own maximum is worked out from the payslip you attach on the next step: up to half of your Basic Pay after pension and PAYE, plus your LFB deductions, a month. Tenor ranges are sample values until confirmed from the Staff Loan Policy.</p>
    </div>
  );
}
