// Audit log (prototype #/admin/audit; NFR-05, RP-10). Read-only: there is no way to
// edit or delete entries. Export goes through the RP-10 report, which is audited.

import { Fragment, useEffect, useState } from 'react';
import { Alert, Autocomplete, Button, Card, IconButton, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, TextField, Tooltip } from '@mui/material';
import { auditApi, reportsApi } from '../../../api/reports';
import { apiError } from '../../../api/client';
import { formatDateTime } from '../../../lib/format';
import { useT } from '../../../i18n';
import DateField from '../../../components/fields/DateField';
import { ACTION_FILTERS, actionName } from '../../../lib/auditActions';

const pretty = (v) => JSON.stringify(v, null, 2);

/** Anyone with a staff record, searched by name or staff number. */
function PersonFilter({ value, onChange }) {
  const t = useT();
  const [input, setInput] = useState('');
  const [options, setOptions] = useState([]);
  useEffect(() => {
    const timer = setTimeout(() => auditApi.people(input).then(setOptions).catch(() => setOptions([])), 200);
    return () => clearTimeout(timer);
  }, [input]);
  return (
    <Autocomplete
      size="small"
      sx={{ width: 260 }}
      options={options}
      value={value}
      onChange={(_, v) => onChange(v)}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      filterOptions={(x) => x}
      isOptionEqualToValue={(a, b) => a.staffNo === b.staffNo}
      getOptionLabel={(o) => `${o.name} (${o.staffNo})`}
      noOptionsText={t('Nobody matches.')}
      renderInput={(params) => <TextField {...params} label={t('Person')} placeholder={t('Name or staff number')} />}
    />
  );
}

export default function AuditPage() {
  const t = useT();
  const [person, setPerson] = useState(null);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      auditApi
        .list({ actor: person?.staffNo, action, from: from ? `${from}T00:00:00+03:00` : '', to: to ? `${to}T23:59:59+03:00` : '', page: page + 1, limit })
        .then((d) => { setData(d); setError(null); })
        .catch((e) => setError(apiError(e).message));
    }, 250);
    return () => clearTimeout(timer);
  }, [person, action, from, to, page, limit]);

  // The export has every entry the filters match, with the action codes.
  const exportXlsx = () => reportsApi.exportFile('audit', 'xlsx', { actor: person?.staffNo, action, from, to }).catch((e) => setError(apiError(e).message));

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('Audit log')}</h1>
          <p>{t('Every sign-in, view of sensitive data, change, decision, upload and export. Read-only: nobody can edit or delete entries.')}</p>
        </div>
        <Button onClick={exportXlsx}>{t('Export')}</Button>
      </div>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card>
        <div className="row" style={{ padding: 16, borderBottom: '1px solid var(--line-2)', alignItems: 'flex-end' }}>
          <PersonFilter value={person} onChange={(v) => { setPerson(v); setPage(0); }} />
          <TextField select size="small" sx={{ width: 240 }} label={t('Action')} value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }} SelectProps={{ displayEmpty: true }}>
            <MenuItem value="">{t('All actions')}</MenuItem>
            {ACTION_FILTERS.map(([v, l]) => <MenuItem key={v} value={v}>{t(l)}</MenuItem>)}
          </TextField>
          <DateField size="small" sx={{ width: 170 }} label={t('From')} value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
          <DateField size="small" sx={{ width: 170 }} label={t('To')} value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
          {data && <span className="small muted" role="status" style={{ paddingBottom: 10 }}>{t('{n} entries', { n: data.total.toLocaleString('en-US') })}</span>}
        </div>
        <div className="tablewrap">
          <Table size="small" aria-label={t('Audit log')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('When')}</TableCell>
                <TableCell>{t('User')}</TableCell>
                <TableCell>{t('Action')}</TableCell>
                <TableCell>{t('Detail')}</TableCell>
                <TableCell>{t('IP address')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.length === 0 && <TableRow><TableCell colSpan={6} className="muted">{t('No entries match.')}</TableCell></TableRow>}
              {data?.items.map((e) => {
                const hasValues = e.before || e.after;
                return (
                  <Fragment key={e._id}>
                    <TableRow>
                      <TableCell className="num" sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(e.at)}</TableCell>
                      <TableCell>{e.actorStaffNo ? (e.actorName ? `${e.actorName} (${e.actorStaffNo})` : e.actorStaffNo) : t('System')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Tooltip title={e.action}><span>{t(actionName(e.action))}</span></Tooltip>
                        {e.status === 'failed' && <span className="tag" style={{ marginLeft: 6 }}>{t('failed')}</span>}
                      </TableCell>
                      <TableCell className="small">{e.description}</TableCell>
                      <TableCell className="num">{e.ip || ''}</TableCell>
                      <TableCell align="right">
                        {hasValues && (
                          <IconButton size="small" aria-expanded={open === e._id} aria-label={open === e._id ? t('Hide before and after values') : t('Show before and after values')} onClick={() => setOpen(open === e._id ? null : e._id)}>
                            {open === e._id ? '−' : '+'}
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                    {open === e._id && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ background: 'var(--canvas)' }}>
                          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                            <div><b className="small">{t('Before')}</b><pre className="xs" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{e.before ? pretty(e.before) : '—'}</pre></div>
                            <div><b className="small">{t('After')}</b><pre className="xs" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{e.after ? pretty(e.after) : '—'}</pre></div>
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
