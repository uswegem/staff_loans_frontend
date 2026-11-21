// Home (prototype #/). For staff: profile completeness while it is incomplete (decision 7),
// open applications, and per product whether they can apply now (with a direct Apply), the
// open application that blocks it, or how many days until they can apply again (NS-02, NS-03).
// Roles and the last sign-in are in the account menu.

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, CardContent, Chip, Link, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { profileApi } from '../../api/staff';
import { applicationsApi } from '../../api/applications';
import AppStatusChip from '../../components/AppStatusChip';
import { OPEN } from '../../lib/statuses';
import { formatDate, formatTzs } from '../../lib/format';
import { apiError } from '../../api/client';
import Meter from '../../components/Meter';
import ApplyBlockers from '../../components/ApplyBlockers';
import { useT } from '../../i18n';
import YourWork from './YourWork';

// Where an open application lives: drafts and returned ones continue in the wizard.
const openPath = (a) => (['draft', 'returned'].includes(a.status) ? `/apply/${a.id}` : `/applications/${a.id}`);

function Eligibility({ data, onApply, busy }) {
  const t = useT();
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <h3 style={{ marginBottom: 8 }}>{t('Loans you can apply for')}</h3>
        <div className="tablewrap">
          <Table size="small" aria-label={t('Loans you can apply for')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('Product')}</TableCell>
                <TableCell align="right">{t('Now')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.products.map((p) => {
                // The open application gets its own link; other reasons show under the name.
                const reasons = p.reasons.filter((r) => !p.openApplication || !r.includes(p.openApplication.ref));
                return (
                  <TableRow key={p.productId}>
                    <TableCell>
                      <b>{p.name}</b>
                      {!p.canApply && reasons.length > 0 && <div className="small muted">{reasons.join(' ')}</div>}
                      {p.daysRemaining > 0 && p.topUpAllowed && (
                        <div className="small muted">{t(p.daysRemaining === 1 ? 'You can apply for a top-up in {n} day (from {date}).' : 'You can apply for a top-up in {n} days (from {date}).', { n: p.daysRemaining, date: formatDate(p.nextEligibleDate) })}</div>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {p.openApplication ? (
                        <Link component={RouterLink} to={openPath(p.openApplication)}>{t('Open: {ref}', { ref: p.openApplication.ref })}</Link>
                      ) : p.canApply ? (
                        <Button size="small" variant="outlined" disabled={busy} onClick={() => onApply(p)} aria-label={t('Apply for {product}', { product: p.name })}>{t('Apply')}</Button>
                      ) : p.daysRemaining ? (
                        <Chip size="small" color="warning" label={t(p.daysRemaining === 1 ? 'In {n} day' : 'In {n} days', { n: p.daysRemaining })} />
                      ) : (
                        <Chip size="small" label={t('Not yet')} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const t = useT();
  const navigate = useNavigate();
  const { user, permissions } = useSelector((st) => st.auth);
  const canApply = permissions.includes('loan.apply');
  const [elig, setElig] = useState(null);
  const [apps, setApps] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const firstName = user.fullName.split(' ')[0];

  useEffect(() => {
    if (canApply) profileApi.eligibility().then(setElig).catch(() => setElig(null));
    if (canApply) applicationsApi.list().then(setApps).catch(() => setApps([]));
  }, [canApply]);

  // Starts that product's application straight away, as choosing it on Apply does.
  const startApplication = async (p) => {
    setBusy(true);
    setError(null);
    try {
      const app = await applicationsApi.create(p.productId);
      navigate(`/apply/${app.id}`);
    } catch (err) {
      setError(apiError(err).message);
      setBusy(false);
    }
  };

  const c = elig?.profile;
  const open = apps.filter((a) => OPEN.includes(a.status));
  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>Karibu, {firstName}</h1>
          <p>
            {user.staffNo}
            {user.title ? `, ${user.title}` : ''}
            {user.department ? `, ${user.department}` : ''}
          </p>
        </div>
        {canApply && c?.complete && <Button variant="contained" component={RouterLink} to="/apply">{t('Apply for a loan')}</Button>}
      </div>
      <div className="stack">
        <YourWork />
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {c && !c.complete && (
          <Alert severity="warning" action={<Button component={RouterLink} to="/profile" variant="contained" size="small">{t('Complete my profile')}</Button>}>
            {t('You can apply once your profile is complete and People and Culture have verified your date of birth.')}
          </Alert>
        )}
        {c?.complete && <ApplyBlockers blockers={elig.blockers} />}
        {c && !c.complete && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h3>{t('My profile')}</h3>
                  <p className="small muted" style={{ margin: 0 }}>{t('Complete every required detail once.')}</p>
                </div>
                <div style={{ minWidth: 240, flex: '0 1 320px' }}>
                  <Meter value={c.done} max={c.total} label={t('{done} of {total} required details', { done: c.done, total: c.total })} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {open.length > 0 && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h3>{t('Open applications')}</h3>
                <Link component={RouterLink} to="/applications">{t('All my applications')}</Link>
              </div>
              {open.map((a) => (
                <div key={a.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--line-2)' }}>
                  <span>
                    <Link component={RouterLink} to={a.status === 'draft' ? `/apply/${a.id}` : `/applications/${a.id}`} sx={{ fontWeight: 600 }}>{a.ref}</Link> {a.product}{a.amount ? `, ${formatTzs(a.amount)}` : ''}
                  </span>
                  <AppStatusChip status={a.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {/* While the profile is incomplete every product shows the same reason: the alert above says it once. */}
        {elig && c?.complete && <Eligibility data={elig} onApply={startApplication} busy={busy} />}
      </div>
    </div>
  );
}
