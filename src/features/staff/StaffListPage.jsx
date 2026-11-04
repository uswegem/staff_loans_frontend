// Staff records (prototype #/staff; FR-01, FR-02). People and Culture search, open,
// add and upload staff records.

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Chip, MenuItem, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField } from '@mui/material';
import { staffApi, downloadFile } from '../../api/staff';
import { apiError } from '../../api/client';
import { useT } from '../../i18n';

const statusChip = (t) => ({ active: null, deactivated: <Chip size="small" label={t('Inactive')} />, exited: <Chip size="small" color="error" label={t('Exited')} /> });

export default function StaffListPage() {
  const t = useT();
  const navigate = useNavigate();
  const canManage = useSelector((st) => st.auth.permissions.includes('staff.manage'));
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('active');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(await staffApi.list({ q: q || undefined, status: status || undefined, category: category || undefined, page: page + 1, limit }));
      setError(null);
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [q, status, category, page, limit]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('Staff records')}</h1>
          <p>{t('Employment details that Staff Loans uses for routing and eligibility. Affordability comes from the payslip attached to each application. Staff complete the rest of their profile.')}</p>
        </div>
        {canManage && (
          <div className="row">
            <Button onClick={() => downloadFile('/staff/import/template', 'LFB_staff_records_template.xlsx').catch((e) => setError(apiError(e).message))}>{t('Excel template')}</Button>
            <Button component={RouterLink} to="/staff/import">{t('Upload from Excel')}</Button>
            <Button variant="contained" component={RouterLink} to="/staff/new">{t('Add staff')}</Button>
          </div>
        )}
      </div>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card>
        <div className="row" style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)', justifyContent: 'space-between' }}>
          <div className="row">
            <TextField sx={{ width: 300, maxWidth: '100%' }} placeholder={t('Search by name, staff number, title or station')} inputProps={{ 'aria-label': t('Search staff') }} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
            <TextField select sx={{ width: 160 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} inputProps={{ 'aria-label': t('Status') }}>
              <MenuItem value="">{t('All statuses')}</MenuItem>
              <MenuItem value="active">{t('Active')}</MenuItem>
              <MenuItem value="deactivated">{t('Inactive')}</MenuItem>
              <MenuItem value="exited">{t('Exited')}</MenuItem>
            </TextField>
            <TextField select sx={{ width: 190 }} value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }} inputProps={{ 'aria-label': t('Category') }} SelectProps={{ displayEmpty: true }}>
              <MenuItem value="">{t('All categories')}</MenuItem>
              <MenuItem value="Management">{t('Management')}</MenuItem>
              <MenuItem value="Non-management">{t('Non-management')}</MenuItem>
            </TextField>
          </div>
          <span className="small muted" role="status">{loading ? t('Loading…') : t('{n} staff', { n: result.total })}</span>
        </div>
        <div className="tablewrap">
          <Table aria-label={t('Staff records')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('Staff')}</TableCell>
                <TableCell>{t('Title')}</TableCell>
                <TableCell>{t('Category')}</TableCell>
                <TableCell>{t('Type')}</TableCell>
                <TableCell>{t('Profile')}</TableCell>
                <TableCell>{t('Sign-in')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {result.items.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/staff/${r.id}`)}>
                  <TableCell>
                    <b>{r.fullName}</b> {statusChip(t)[r.status]}
                    <div className="xs muted">{r.staffNo}</div>
                  </TableCell>
                  <TableCell>
                    {r.title}
                    <div className="xs muted">{r.station}</div>
                  </TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>{r.employmentType}</TableCell>
                  <TableCell>{r.profile.complete ? <Chip size="small" color="success" label={t('Complete')} /> : <Chip size="small" color="warning" label={`${r.profile.done}/${r.profile.total}`} />}</TableCell>
                  <TableCell className="small">{r.signIn ? (r.signIn === 'active' ? t('Yes') : t(r.signIn)) : <span className="muted">{t('None')}</span>}</TableCell>
                  <TableCell align="right">
                    <Button size="small" component={RouterLink} to={`/staff/${r.id}`} onClick={(e) => e.stopPropagation()}>{t('Open')}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination component="div" count={result.total} page={page} rowsPerPage={limit} rowsPerPageOptions={[10, 25, 50, 100]} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }} />
      </Card>
    </div>
  );
}
