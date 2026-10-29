// Upload staff records from Excel (prototype bulk upload; FR-02). Rows are checked
// on the server first; nothing changes until People and Culture confirm. Error rows
// download as Excel in the template's columns, to fix and upload again.

import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, CardContent, Chip, Link, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs } from '@mui/material';
import { staffApi, downloadFile } from '../../api/staff';
import { apiError } from '../../api/client';
import s from './staff.module.css';

const OUTCOME = {
  new: <Chip size="small" color="success" label="New staff member" />,
  update: <Chip size="small" label="Update" />,
  unchanged: <Chip size="small" label="No change" sx={{ background: 'transparent', border: '1px solid var(--line)' }} />,
  error: <Chip size="small" color="error" label="Error" />,
};

export default function StaffImportPage() {
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
      <div className="small muted" style={{ marginBottom: 8 }}><Link component={RouterLink} to="/staff" color="inherit">Staff records</Link></div>
      <div className="pagehead">
        <div>
          <h1>Upload staff records from Excel</h1>
          <p>Rows are checked first. Nothing changes until you confirm. Salary changes are kept as history.</p>
        </div>
      </div>
      <div className="stack">
        {error && <Alert severity="error" onClose={() => setError(null)}><AlertTitle>This file could not be used</AlertTitle>{error}</Alert>}
        {imp?.status === 'committed' && (
          <Alert severity="success" action={<Button size="small" onClick={() => navigate('/staff')}>Back to staff records</Button>}>
            <AlertTitle>Upload applied</AlertTitle>
            {imp.result.created} new staff added, {imp.result.updated} records updated{imp.result.skipped ? `, ${imp.result.skipped} rows skipped` : ''}.
          </Alert>
        )}
        <Card>
          <CardContent sx={{ p: 3 }}>
            {!imp ? (
              <>
                <label className={`${s.drop} ${over ? s.over : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files[0]); }}>
                  <div><b style={{ color: '#000' }}>{busy ? 'Checking the rows…' : 'Choose an Excel file'}</b>{busy ? '' : ' or drag it here'}</div>
                  <div className="xs">.xlsx, .xls or .csv, one row per staff member, up to 5,000 rows and 5 MB</div>
                  <input type="file" accept=".xlsx,.xls,.csv" aria-label="Choose an Excel file" disabled={busy} onChange={(e) => send(e.target.files[0])} />
                </label>
                <p className="small muted" style={{ marginTop: 12 }}>
                  No file yet?{' '}
                  <Link component="button" type="button" onClick={() => downloadFile('/staff/import/template', 'LFB_staff_records_template.xlsx').catch((e) => setError(apiError(e).message))}>Download the Excel template</Link>
                  . It has an Instructions sheet.
                </p>
              </>
            ) : (
              <>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span><b>{imp.fileName}</b> <span className="small muted">{imp.rows.length} rows checked</span></span>
                  {imp.status === 'previewed' && <Button variant="text" onClick={discard}>Choose another file</Button>}
                </div>
                <div className={s.figures}>
                  <div className={s.figure}><b>{n.new}</b><span>New staff</span></div>
                  <div className={s.figure}><b>{n.update}</b><span>Updates</span></div>
                  <div className={s.figure}><b>{n.unchanged}</b><span>No change</span></div>
                  <div className={s.figure}><b style={n.error ? { color: 'var(--bad)' } : undefined}>{n.error}</b><span>With errors</span></div>
                </div>
                <Tabs value={filter} onChange={(_, v) => setFilter(v)} variant="scrollable" sx={{ mb: 1 }}>
                  <Tab value="all" label="All rows" />
                  <Tab value="new" label="New" />
                  <Tab value="update" label="Updates" />
                  <Tab value="error" label="Errors" />
                </Tabs>
                <div className="tablewrap" style={{ maxHeight: 420, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
                  <Table size="small" stickyHeader aria-label="Checked rows">
                    <TableHead>
                      <TableRow>
                        <TableCell>Row</TableCell>
                        <TableCell>Staff</TableCell>
                        <TableCell>Result</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.rowNo}>
                          <TableCell className="num">{r.rowNo}</TableCell>
                          <TableCell><b>{r.staffNo || '—'}</b><div className="xs muted">{r.name}</div></TableCell>
                          <TableCell>{OUTCOME[r.outcome]}</TableCell>
                          <TableCell className="small">{r.outcome === 'error' ? <span style={{ color: 'var(--bad)' }}>{r.problems.join('; ')}</span> : r.changes.join('; ') || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {n.error > 0 && (
                  <p className="small muted" style={{ margin: '10px 0 0' }}>
                    Rows with errors are skipped.{' '}
                    <Link component="button" type="button" onClick={() => downloadFile(`/staff/import/${imp.id}/errors.xlsx`, 'staff_records_errors.xlsx').catch((e) => setError(apiError(e).message))}>Download them with the reasons</Link>
                    , fix them and upload again.
                  </p>
                )}
                {imp.status === 'previewed' && (
                  <div className="row" style={{ marginTop: 20 }}>
                    <Button variant="contained" onClick={commit} disabled={!valid || busy}>{valid ? `Apply ${valid} valid row${valid > 1 ? 's' : ''}` : 'No rows to apply'}</Button>
                    <Button onClick={discard} disabled={busy}>Cancel</Button>
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
