// Upload staff records from Excel (prototype bulk upload; FR-02). Rows are checked
// on the server first; nothing changes until People and Culture confirm. Error rows
// download as Excel in the template's columns, to fix and upload again.

import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, CardContent, Chip, Link, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs } from '@mui/material';
import { staffApi, downloadFile } from '../../api/staff';
import { apiError } from '../../api/client';
import s from './staff.module.css';
import { useT } from '../../i18n';

const outcomeChip = (t) => ({
  new: <Chip size="small" color="success" label={t('New staff member')} />,
  update: <Chip size="small" label={t('Update')} />,
  unchanged: <Chip size="small" label={t('No change')} sx={{ background: 'transparent', border: '1px solid var(--line)' }} />,
  error: <Chip size="small" color="error" label={t('Error')} />,
});

export default function StaffImportPage() {
  const t = useT();
  const navigate = useNavigate();
  const [imp, setImp] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');
  const [over, setOver] = useState(false);

  const send = async (file) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setImp(await staffApi.upload(file));
      setFilter('all');
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setBusy(true);
    try {
      const done = await staffApi.commitImport(imp.id);
      setImp(done);
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    await staffApi.discardImport(imp.id).catch(() => {});
    setImp(null);
  };

  const n = imp?.summary || {};
  const valid = (n.new || 0) + (n.update || 0);
  const rows = imp ? imp.rows.filter((r) => filter === 'all' || r.outcome === filter) : [];

  return (
    <div className="page">
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/staff" color="inherit">{t('Staff records')}</Link></div>
      <div className="pagehead">
        <div>
          <h1>{t('Upload staff records from Excel')}</h1>
          <p>{t('Rows are checked first. Nothing changes until you confirm. Salary changes are kept as history.')}</p>
        </div>
      </div>
      <div className="stack">
        {error && <Alert severity="error" onClose={() => setError(null)}><AlertTitle>{t('This file could not be used')}</AlertTitle>{error}</Alert>}
        {imp?.status === 'committed' && (
          <Alert severity="success" action={<Button size="small" onClick={() => navigate('/staff')}>{t('Back to staff records')}</Button>}>
            <AlertTitle>{t('Upload applied')}</AlertTitle>
            {t('{created} new staff added, {updated} records updated', { created: imp.result.created, updated: imp.result.updated })}{imp.result.skipped ? `, ${t('{n} rows skipped', { n: imp.result.skipped })}` : ''}.
          </Alert>
        )}
        <Card>
          <CardContent sx={{ p: 3 }}>
            {!imp ? (
              <>
                <label className={`${s.drop} ${over ? s.over : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files[0]); }}>
                  <div><b style={{ color: 'var(--strong)' }}>{busy ? t('Checking the rows…') : t('Choose an Excel file')}</b>{busy ? '' : ` ${t('or drag it here')}`}</div>
                  <div className="xs">{t('.xlsx, .xls or .csv, one row per staff member, up to 5,000 rows and 5 MB')}</div>
                  <input type="file" accept=".xlsx,.xls,.csv" aria-label={t('Choose an Excel file')} disabled={busy} onChange={(e) => send(e.target.files[0])} />
                </label>
                <p className="small muted" style={{ marginTop: 12 }}>
                  {t('No file yet?')}{' '}
                  <Link component="button" type="button" onClick={() => downloadFile('/staff/import/template', 'LFB_staff_records_template.xlsx').catch((e) => setError(apiError(e).message))}>{t('Download the Excel template')}</Link>
                  {t('. It has an Instructions sheet.')}
                </p>
              </>
            ) : (
              <>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span><b>{imp.fileName}</b> <span className="small muted">{t('{n} rows checked', { n: imp.rows.length })}</span></span>
                  {imp.status === 'previewed' && <Button variant="text" onClick={discard}>{t('Choose another file')}</Button>}
                </div>
                <div className={s.figures}>
                  <div className={s.figure}><b>{n.new}</b><span>{t('New staff')}</span></div>
                  <div className={s.figure}><b>{n.update}</b><span>{t('Updates')}</span></div>
                  <div className={s.figure}><b>{n.unchanged}</b><span>{t('No change')}</span></div>
                  <div className={s.figure}><b style={n.error ? { color: 'var(--bad)' } : undefined}>{n.error}</b><span>{t('With errors')}</span></div>
                </div>
                <Tabs value={filter} onChange={(_, v) => setFilter(v)} variant="scrollable" sx={{ mb: 1 }}>
                  <Tab value="all" label={t('All rows')} />
                  <Tab value="new" label={t('New')} />
                  <Tab value="update" label={t('Updates')} />
                  <Tab value="error" label={t('Errors')} />
                </Tabs>
                <div className="tablewrap" style={{ maxHeight: 420, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
                  <Table size="small" stickyHeader aria-label={t('Checked rows')}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('Row')}</TableCell>
                        <TableCell>{t('Staff')}</TableCell>
                        <TableCell>{t('Result')}</TableCell>
                        <TableCell>{t('Details')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.rowNo}>
                          <TableCell className="num">{r.rowNo}</TableCell>
                          <TableCell><b>{r.staffNo || '—'}</b><div className="xs muted">{r.name}</div></TableCell>
                          <TableCell>{outcomeChip(t)[r.outcome]}</TableCell>
                          <TableCell className="small">{r.outcome === 'error' ? <span style={{ color: 'var(--bad)' }}>{r.problems.join('; ')}</span> : r.changes.join('; ') || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {n.error > 0 && (
                  <p className="small muted" style={{ margin: '10px 0 0' }}>
                    {t('Rows with errors are skipped.')}{' '}
                    <Link component="button" type="button" onClick={() => downloadFile(`/staff/import/${imp.id}/errors.xlsx`, 'staff_records_errors.xlsx').catch((e) => setError(apiError(e).message))}>{t('Download them with the reasons')}</Link>
                    {t(', fix them and upload again.')}
                  </p>
                )}
                {imp.status === 'previewed' && (
                  <div className="row" style={{ marginTop: 20 }}>
                    <Button variant="contained" onClick={commit} disabled={!valid || busy}>{valid ? t(valid > 1 ? 'Apply {n} valid rows' : 'Apply {n} valid row', { n: valid }) : t('No rows to apply')}</Button>
                    <Button onClick={discard} disabled={busy}>{t('Cancel')}</Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
