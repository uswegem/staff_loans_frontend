// Home. Milestone 1 shows the signed-in person and their access; applications,
// affordability and profile completeness arrive with milestones 3 and 4.

import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Card, CardContent, Link } from '@mui/material';
import { formatDateTime } from '../../lib/format';

export default function Home() {
  const { user, roles, mfaRequired } = useSelector((st) => st.auth);
  const firstName = user.fullName.split(' ')[0];
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
        <Alert severity="info">Applying for a loan opens in a later release. Your profile and applications will appear here.</Alert>
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
