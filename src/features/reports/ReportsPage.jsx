// Reports (prototype #/reports; BRD 12: RP-01 to RP-07, RP-10). The API applies the
// limited-details rule (FR-55) to the screen and every export alike; this page only
// shows what it gets back.

import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, MenuItem, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField } from '@mui/material';
import { reportsApi } from '../../api/reports';
import { apiError } from '../../api/client';
import { formatDate, formatNumber, formatTzs } from '../../lib/format';
import { useSelector } from 'react-redux';
import s from './reports.module.css';

const hm = (h) => `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} min`;

function Overview({ data }) {
  const maxH = Math.max(...data.stages.map((b) => Math.max(b.average, b.target))) * 1.1 || 1;
  const maxAmt = Math.max(...data.disbursedByProduct.map((x) => x.amount), 1);
  return (
    <>
      <div className={s.figures}>
        <Card><CardContent className={s.figure}><span className={s.v}>{data.inReview}</span><span className={s.k}>In review now, {data.overdue} overdue</span></CardContent></Card>
        <Card><CardContent className={s.figure}><span className={s.v}>{data.pendingDisbursement}</span><span className={s.k}>Approved, not yet disbursed{data.outsideSla ? `; ${data.outsideSla} outside SLA` : ''}</span></CardContent></Card>
        <Card><CardContent className={s.figure}><span className={s.v}>{formatTzs(data.disbursedAmount)}</span><span className={s.k}>Disbursed through Staff Loans ({data.disbursedCount} loans)</span></CardContent></Card>
      </div>
      <div className={s.two}>
        <Card>
          <CardContent>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}><h3 style={{ margin: 0 }}>Average time per stage</h3><span className="xs muted">Working hours since {formatDate(data.stagesSince)}; red line is the target</span></div>
            <div className={s.bars}>
              {data.stages.map((b) => (
                <div key={b.stage} className={s.bar}>
                  <span>{b.label}</span>
                  <span className={s.track} role="img" aria-label={`${b.label}: ${b.decisions ? hm(b.average) : 'no decisions'}, target ${b.target} hours`}>
                    <i className={b.average > b.target ? s.over : ''} style={{ width: `${(b.average / maxH) * 100}%` }} />
                    <span className={s.tgt} style={{ left: `${(b.target / maxH) * 100}%` }} />
                  </span>
                  <span className={s.num}>{b.decisions ? hm(b.average) : '—'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}><h3 style={{ margin: 0 }}>Disbursed by product</h3><span className="xs muted">TZS</span></div>
            <div className={s.bars}>
              {data.disbursedByProduct.length === 0 && <p className="muted small" style={{ margin: 0 }}>Nothing disbursed yet.</p>}
              {data.disbursedByProduct.map((x) => (
                <div key={x.product} className={s.bar}>
                  <span>{x.product}</span>
                  <span className={s.track} role="img" aria-label={`${x.product}: TZS ${formatNumber(x.amount)}`}><i style={{ width: `${(x.amount / maxAmt) * 100}%` }} /></span>
                  <span className={s.num}>{formatNumber(x.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

const EMPTY = { from: '', to: '', productId: '', department: '', station: '', category: '', status: '', groupBy: 'product', q: '', action: '' };

function Filters({ def, options, value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const has = (f) => def.filters.includes(f);
  const select = (k, label, items) => (
    <TextField select size="small" label={label} value={value[k]} onChange={set(k)}>
      <MenuItem value="">All</MenuItem>
      {items.map((i) => <MenuItem key={i.value ?? i} value={i.value ?? i}>{i.label ?? i}</MenuItem>)}
    </TextField>
  );
  if (!def.filters.length) return null;
  return (
    <div className={s.filters}>
      {has('dates') && <TextField size="small" type="date" label="From" value={value.from} onChange={set('from')} InputLabelProps={{ shrink: true }} />}
      {has('dates') && <TextField size="small" type="date" label="To" value={value.to} onChange={set('to')} InputLabelProps={{ shrink: true }} />}
      {has('groupBy') && (
        <TextField select size="small" label="Group by" value={value.groupBy} onChange={set('groupBy')}>
          <MenuItem value="product">Product</MenuItem>
          <MenuItem value="branch">Branch</MenuItem>
          <MenuItem value="category">Category</MenuItem>
        </TextField>
      )}
      {has('product') && select('productId', 'Product', options.products.map((p) => ({ value: p.id, label: p.name })))}
      {has('department') && select('department', 'Department', options.departments)}
      {has('branch') && select('station', 'Branch', options.branches)}
      {has('category') && select('category', 'Category', options.categories)}
      {has('status') && select('status', 'Status', options.statuses)}
      {has('q') && <TextField size="small" label="Search" value={value.q} onChange={set('q')} placeholder="User, action or reference" />}
      {has('action') && <TextField size="small" label="Action starts with" value={value.action} onChange={set('action')} placeholder="e.g. review." />}
    </div>
  );
}

function Cell({ value, column }) {
  if (value === 'Limited details') return <TableCell className={s.limited}>Limited details</TableCell>;
  if (column.type === 'money') return <TableCell className={s.num}>{value === '' || value == null ? '' : formatNumber(value)}</TableCell>;
  if (column.type === 'number') return <TableCell className={s.num}>{value}</TableCell>;
  if (column.type === 'date') return <TableCell sx={{ whiteSpace: 'nowrap' }}>{value ? formatDate(value) : ''}</TableCell>;
  if (column.label.startsWith('Fingerprint')) return <TableCell><code className="xs" title={value}>{String(value).slice(0, 16)}…</code></TableCell>;
  return <TableCell sx={column.type === 'datetime' ? { whiteSpace: 'nowrap' } : undefined}>{value}</TableCell>;
}

function Report({ def, options }) {
  const [filters, setFilters] = useState(EMPTY);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    const t = setTimeout(() => {
      reportsApi.get(def.key, filters).then((d) => { setData(d); setError(null); }).catch((e) => setError(apiError(e).message));
    }, 250);
    return () => clearTimeout(t);
  }, [def.key, filters]);

  const exportAs = (format) => reportsApi.exportFile(def.key, format, filters).catch((e) => setError(apiError(e).message));

  return (
    <Card>
      <div className="row" style={{ justifyContent: 'space-between', padding: '16px 16px 0' }}>
        <h3 style={{ margin: 0 }}>{def.id} {def.name}</h3>
        {def.canExport && (
          <div className="row">
            <Button size="small" onClick={() => exportAs('csv')}>CSV</Button>
            <Button size="small" onClick={() => exportAs('xlsx')}>Excel</Button>
            <Button size="small" onClick={() => exportAs('pdf')}>PDF</Button>
          </div>
        )}
      </div>
      <Filters def={def} options={options} value={filters} onChange={setFilters} />
      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
      {data && (data.limitedCount > 0 || data.excluded > 0 || data.truncated) && (
        <Alert severity="info" sx={{ m: 2, mb: 0 }}>
          {data.limitedCount > 0 && `${data.limitedCount} management-route ${data.limitedCount === 1 ? 'row shows' : 'rows show'} limited details only. `}
          {data.excluded > 0 && `${data.excluded} limited-details ${data.excluded === 1 ? 'application is' : 'applications are'} left out because the filter uses details you cannot see. `}
          {data.truncated && `Showing the first ${data.rows.length} of ${data.total} rows; the export has them all.`}
        </Alert>
      )}
      {!data && !error && <p className="muted" role="status" style={{ padding: 16 }}>Loading…</p>}
      {data && (
        <div className="tablewrap">
          <Table size="small" aria-label={def.name}>
            <TableHead>
              <TableRow>{data.columns.map((c) => <TableCell key={c.label} className={c.type === 'money' || c.type === 'number' ? s.num : undefined}>{c.label}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {data.rows.length === 0 && <TableRow><TableCell colSpan={data.columns.length} className="muted">No rows for these filters.</TableCell></TableRow>}
              {data.rows.map((row, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <TableRow key={i}>{row.map((v, j) => <Cell key={data.columns[j].label} value={v} column={data.columns[j]} />)}</TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

export default function ReportsPage() {
  const permissions = useSelector((st) => st.auth.permissions);
  const canOverview = permissions.includes('reports.view');
  const [catalogue, setCatalogue] = useState(null);
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState(canOverview ? 'overview' : null);
  const [error, setError] = useState(null);

  useEffect(() => {
    reportsApi.catalogue().then((c) => { setCatalogue(c); setTab((t) => t || c.reports[0]?.key); }).catch((e) => setError(apiError(e).message));
    if (canOverview) reportsApi.overview().then(setOverview).catch((e) => setError(apiError(e).message));
  }, [canOverview]);

  const def = catalogue?.reports.find((r) => r.key === tab);
  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>Reports</h1>
          <p>Exports open in Excel. Staff Loans covers applications up to disbursement; repayments are reported from core banking.</p>
        </div>
      </div>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {catalogue && (
        <Tabs value={tab || false} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }} aria-label="Reports">
          {canOverview && <Tab value="overview" label="Overview" />}
          {catalogue.reports.map((r) => <Tab key={r.key} value={r.key} label={r.name} />)}
        </Tabs>
      )}
      {tab === 'overview' && overview && <Overview data={overview} />}
      {def && <Report key={def.key} def={def} options={catalogue.options} />}
    </div>
  );
}
