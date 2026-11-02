// Home (prototype #/). For staff: profile completeness (decision 7) and, per product,
// whether they can apply now or how many days until they can apply again or top up
// (NS-02, NS-03). Applications and affordability join in milestone 4.

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, CardContent, Chip, Link, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { profileApi } from '../../api/staff';
import { applicationsApi } from '../../api/applications';
import AppStatusChip from '../../components/AppStatusChip';
import { OPEN } from '../../lib/statuses';
import { formatDate, formatDateTime, formatTzs } from '../../lib/format';
import Meter from '../../components/Meter';
import ApplyBlockers from '../../components/ApplyBlockers';
import { useT } from '../../i18n';

function Eligibility({ data }) {
  const t = useT();
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <h3 style={{ marginBottom: 4 }}>{t('Loans you can apply for')}</h3>
        <p className="small muted">{t('You can apply for the same product again six months after your last successful application, and for a different product at any time.')}</p>
        <div className="tablewrap">
          <Table size="small" aria-label={t('Loans you can apply for')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('Product')}</TableCell>
                <TableCell>{t('Now')}</TableCell>
                <TableCell>{t('Details')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.products.map((p) => (
                <TableRow key={p.productId}>
                  <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                  <TableCell>
                    {p.canApply ? <Chip size="small" color="success" label={t('You can apply')} /> : p.daysRemaining ? <Chip size="small" color="warning" label={t(p.daysRemaining === 1 ? 'In {n} day' : 'In {n} days', { n: p.daysRemaining })} /> : <Chip size="small" label={t('Not yet')} />}
                  </TableCell>
                  <TableCell className="small">
                    {p.daysRemaining > 0 && p.topUpAllowed && (
                      <div>
                        <b>{t(p.daysRemaining === 1 ? 'You can apply for a top-up in {n} day (from {date}).' : 'You can apply for a top-up in {n} days (from {date}).', { n: p.daysRemaining, date: formatDate(p.nextEligibleDate) })}</b>
                      </div>
                    )}
                    {p.reasons.filter((r) => !r.startsWith('You can apply once your profile') && !r.startsWith(t('You can apply once your profile is complete.').slice(0, 24))).map((r) => <div key={r}>{r}</div>)}
                    {p.canApply && (p.lastAppliedAt ? t('Last applied {date}.', { date: formatDate(p.lastAppliedAt) }) : '—')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const t = useT();
  const { user, roles, permissions, mfaRequired } = useSelector((st) => st.auth);
  const canApply = permissions.includes('loan.apply');
  const [elig, setElig] = useState(null);
  const [apps, setApps] = useState([]);
  const firstName = user.fullName.split(' ')[0];

  useEffect(() => {
    if (canApply) profileApi.eligibility().then(setElig).catch(() => setElig(null));
    if (canApply) applicationsApi.list().then(setApps).catch(() => setApps([]));
  }, [canApply]);

  const c = elig?.profile;
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
        {canApply && <Button variant="contained" component={RouterLink} to="/apply">{t('Apply for a loan')}</Button>}
      </div>
      <div className="stack">
        {c && !c.complete && (
          <Alert severity="warning" action={<Button component={RouterLink} to="/profile" variant="contained" size="small">{t('Complete my profile')}</Button>}>
            <AlertTitle>{t('You can apply once your profile is complete')}</AlertTitle>
            {t('Missing: {list}.', { list: c.missing.map((m) => t(m.label)).join(', ') })}
          </Alert>
        )}
        {c?.complete && <ApplyBlockers blockers={elig.blockers} />}
        {c && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h3>{t('My profile')}</h3>
                  <p className="small muted" style={{ margin: 0 }}>{c.complete ? t('Complete. Each application fills in from it.') : t('Complete every required detail once.')}</p>
                </div>
                <div style={{ minWidth: 240, flex: '0 1 320px' }}>
                  <Meter value={c.done} max={c.total} label={t('{done} of {total} required details', { done: c.done, total: c.total })} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {apps.filter((a) => OPEN.includes(a.status)).length > 0 && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h3>{t('Open applications')}</h3>
                <Link component={RouterLink} to="/applications">{t('All my applications')}</Link>
              </div>
              {apps.filter((a) => OPEN.includes(a.status)).map((a) => (
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
        {elig && <Eligibility data={elig} />}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <h3 style={{ marginBottom: 8 }}>{t('Your access')}</h3>
            <div className="row" style={{ marginBottom: 12 }}>
              {roles.map((r) => (
                <span key={r.id} className="tag">{r.name}</span>
              ))}
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              {t('Last sign-in {when}.', { when: formatDateTime(user.lastLoginAt) })} {mfaRequired ? t('You confirm a one-time code at every sign-in.') : ''}{' '}
              <Link component={RouterLink} to="/account/access">{t('See all your permissions')}</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
