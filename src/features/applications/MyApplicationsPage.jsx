// My applications (prototype #/applications; FR-11).

import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { applicationsApi } from '../../api/applications';
import { apiError } from '../../api/client';
import { formatDate, formatNumber } from '../../lib/format';
import AppStatusChip from '../../components/AppStatusChip';
import { useT } from '../../i18n';

export default function MyApplicationsPage() {
  const t = useT();
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
          <h1>{t('My applications')}</h1>
          <p>{t('Every staff loan you applied for, and where it is now.')}</p>
        </div>
        <Button variant="contained" component={RouterLink} to="/apply">{t('Apply for a loan')}</Button>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      {rows && !rows.length && <Alert severity="info">{t('You have not applied for a staff loan yet.')}</Alert>}
      {rows && rows.length > 0 && (
        <Card>
          <div className="tablewrap">
            <Table aria-label={t('My applications')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Reference')}</TableCell>
                  <TableCell>{t('Product')}</TableCell>
                  <TableCell align="right">{t('Amount (TZS)')}</TableCell>
                  <TableCell>{t('Tenor')}</TableCell>
                  <TableCell>{t('Status')}</TableCell>
                  <TableCell>{t('Submitted')}</TableCell>
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
