// Audit log (prototype #/admin/audit; NFR-05, RP-10). Read-only: there is no way to
// edit or delete entries. Export goes through the RP-10 report, which is audited.

import { Fragment, useEffect, useState } from 'react';
import { Alert, Button, Card, IconButton, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, TextField } from '@mui/material';
import { auditApi, reportsApi } from '../../../api/reports';
import { apiError } from '../../../api/client';
import { formatDateTime } from '../../../lib/format';

const pretty = (v) => JSON.stringify(v, null, 2);

export default function AuditPage() {
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      auditApi
        .list({ q, from: from ? `${from}T00:00:00+03:00` : '', to: to ? `${to}T23:59:59+03:00` : '', page: page + 1, limit })
        .then((d) => { setData(d); setError(null); })
        .catch((e) => setError(apiError(e).message));
    }, 250);
    return () => clearTimeout(t);
  }, [q, from, to, page, limit]);

  const exportXlsx = () => reportsApi.exportFile('audit', 'xlsx', { q, from, to }).catch((e) => setError(apiError(e).message));

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>Audit log</h1>
          <p>Every sign-in, view of sensitive data, change, decision, upload and export. Read-only: nobody can edit or delete entries.</p>
        </div>
        <Button onClick={exportXlsx}>Export</Button>
      </div>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card>
        <div className="row" style={{ padding: 16, borderBottom: '1px solid var(--line-2)' }}>
          <TextField size="small" sx={{ maxWidth: 340, flex: 1 }} label="Filter by user, action or reference" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          <TextField size="small" type="date" label="From" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="To" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
          {data && <span className="small muted">{data.total.toLocaleString('en-US')} entries</span>}
        </div>
        <div className="tablewrap">
          <Table size="small" aria-label="Audit log">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Detail</TableCell>
                <TableCell>IP address</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.length === 0 && <TableRow><TableCell colSpan={6} className="muted">No entries match.</TableCell></TableRow>}
              {data?.items.map((e) => {
                const hasValues = e.before || e.after;
                return (
                  <Fragment key={e._id}>
                    <TableRow>
                      <TableCell className="num" sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(e.at)}</TableCell>
                      <TableCell>{e.actorStaffNo || 'System'}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{e.action}{e.status === 'failed' && <span className="tag" style={{ marginLeft: 6 }}>failed</span>}</TableCell>
                      <TableCell className="small">{e.description}</TableCell>
                      <TableCell className="num">{e.ip || ''}</TableCell>
                      <TableCell align="right">
                        {hasValues && (
                          <IconButton size="small" aria-expanded={open === e._id} aria-label={open === e._id ? 'Hide before and after values' : 'Show before and after values'} onClick={() => setOpen(open === e._id ? null : e._id)}>
                            {open === e._id ? '−' : '+'}
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                    {open === e._id && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ background: 'var(--canvas)' }}>
                          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                            <div><b className="small">Before</b><pre className="xs" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{e.before ? pretty(e.before) : '—'}</pre></div>
                            <div><b className="small">After</b><pre className="xs" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{e.after ? pretty(e.after) : '—'}</pre></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {data && (
          <TablePagination component="div" count={data.total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={limit} onRowsPerPageChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[25, 50, 100, 200]} />
        )}
      </Card>
    </div>
  );
}
