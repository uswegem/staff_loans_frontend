// Home (prototype #/). For staff: profile completeness (decision 7) and, per product,
// whether they can apply now or how many days until they can apply again or top up
// (NS-02, NS-03). Applications and affordability join in milestone 4.

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, CardContent, Chip, Link, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { profileApi } from '../../api/staff';
import { formatDate, formatDateTime } from '../../lib/format';
import Meter from '../../components/Meter';

function Eligibility({ data }) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <h3 style={{ marginBottom: 4 }}>Loans you can apply for</h3>
        <p className="small muted">You can apply for the same product again six months after your last successful application, and for a different product at any time.</p>
        <div className="tablewrap">
          <Table size="small" aria-label="Loans you can apply for">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Now</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.products.map((p) => (
                <TableRow key={p.productId}>
                  <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                  <TableCell>
                    {p.canApply ? <Chip size="small" color="success" label="You can apply" /> : p.daysRemaining ? <Chip size="small" color="warning" label={`In ${p.daysRemaining} ${p.daysRemaining === 1 ? 'day' : 'days'}`} /> : <Chip size="small" label="Not yet" />}
                  </TableCell>
                  <TableCell className="small">
                    {p.daysRemaining > 0 && p.topUpAllowed && (
                      <div>
                        <b>You can apply for a top-up in {p.daysRemaining} {p.daysRemaining === 1 ? 'day' : 'days'} (from {formatDate(p.nextEligibleDate)}).</b>
                      </div>
                    )}
                    {p.reasons.filter((r) => !r.startsWith('You can apply once your profile')).map((r) => <div key={r}>{r}</div>)}
                    {p.canApply && (p.lastAppliedAt ? `Last applied ${formatDate(p.lastAppliedAt)}.` : '—')}
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
  const { user, roles, permissions, mfaRequired } = useSelector((st) => st.auth);
  const canApply = permissions.includes('loan.apply');
  const [elig, setElig] = useState(null);
  const firstName = user.fullName.split(' ')[0];

  useEffect(() => {
    if (canApply) profileApi.eligibility().then(setElig).catch(() => setElig(null));
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
      </div>
      <div className="stack">
        {c && !c.complete && (
          <Alert severity="warning" action={<Button component={RouterLink} to="/profile" variant="contained" size="small">Complete my profile</Button>}>
            <AlertTitle>You can apply once your profile is complete</AlertTitle>
            Missing: {c.missing.map((m) => m.label).join(', ')}.
          </Alert>
        )}
        {c && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h3>My profile</h3>
                  <p className="small muted" style={{ margin: 0 }}>{c.complete ? 'Complete. Each application fills in from it.' : 'Complete every required detail once.'}</p>
                </div>
                <div style={{ minWidth: 240, flex: '0 1 320px' }}>
                  <Meter value={c.done} max={c.total} label={`${c.done} of ${c.total} required details`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {elig && <Eligibility data={elig} />}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <h3 style={{ marginBottom: 8 }}>Your access</h3>
            <div className="row" style={{ marginBottom: 12 }}>
              {roles.map((r) => (
                <span key={r.id} className="tag">{r.name}</span>
              ))}
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              Last sign-in {formatDateTime(user.lastLoginAt)}. {mfaRequired ? 'You confirm a one-time code at every sign-in.' : ''}{' '}
              <Link component={RouterLink} to="/account/access">See all your permissions</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
