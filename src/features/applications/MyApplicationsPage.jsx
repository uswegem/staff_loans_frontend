// My applications (prototype #/applications; FR-11).

import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { applicationsApi } from '../../api/applications';
import { apiError } from '../../api/client';
import { formatDate, formatNumber } from '../../lib/format';
import AppStatusChip from '../../components/AppStatusChip';

export default function MyApplicationsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    applicationsApi.list().then(setRows).catch((e) => setError(apiError(e).message));
  }, []);

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>My applications</h1>
          <p>Every staff loan you applied for, and where it is now.</p>
        </div>
        <Button variant="contained" component={RouterLink} to="/apply">Apply for a loan</Button>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      {rows && !rows.length && <Alert severity="info">You have not applied for a staff loan yet.</Alert>}
      {rows && rows.length > 0 && (
        <Card>
          <div className="tablewrap">
            <Table aria-label="My applications">
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Amount (TZS)</TableCell>
                  <TableCell>Tenor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(r.status === 'draft' ? `/apply/${r.id}` : `/applications/${r.id}`)}>
                    <TableCell sx={{ fontWeight: 600 }}>{r.ref}</TableCell>
                    <TableCell>{r.product}</TableCell>
                    <TableCell align="right" className="num">{formatNumber(r.amount)}</TableCell>
                    <TableCell>{r.tenor ? `${r.tenor} months` : '—'}</TableCell>
                    <TableCell><AppStatusChip status={r.status} /></TableCell>
                    <TableCell>{formatDate(r.submittedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
