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
import { translate, useT } from '../../i18n';

const hm = (h) => translate('{h} h {m} min', { h: Math.floor(h), m: String(Math.round((h % 1) * 60)).padStart(2, '0') });

function Overview({ data }) {
  const t = useT();
  const maxH = Math.max(...data.stages.map((b) => Math.max(b.average, b.target))) * 1.1 || 1;
  const maxAmt = Math.max(...data.disbursedByProduct.map((x) => x.amount), 1);
  return (
    <>
      <div className={s.figures}>
        <Card><CardContent className={s.figure}><span className={s.v}>{data.inReview}</span><span className={s.k}>{t('In review now, {n} overdue', { n: data.overdue })}</span></CardContent></Card>
        <Card><CardContent className={s.figure}><span className={s.v}>{data.pendingDisbursement}</span><span className={s.k}>{t('Approved, not yet disbursed')}{data.outsideSla ? `; ${t('{n} outside SLA', { n: data.outsideSla })}` : ''}</span></CardContent></Card>
        <Card><CardContent className={s.figure}><span className={s.v}>{formatTzs(data.disbursedAmount)}</span><span className={s.k}>{t('Disbursed through Staff Loans ({n} loans)', { n: data.disbursedCount })}</span></CardContent></Card>
      </div>
      <div className={s.two}>
        <Card>
          <CardContent>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}><h3 style={{ margin: 0 }}>{t('Average time per stage')}</h3><span className="xs muted">{t('Working hours since {date}; red line is the target', { date: formatDate(data.stagesSince) })}</span></div>
            <div className={s.bars}>
              {data.stages.map((b) => (
                <div key={b.stage} className={s.bar}>
                  <span>{t(b.label)}</span>
                  <span className={s.track} role="img" aria-label={t('{stage}: {average}, target {target} hours', { stage: t(b.label), average: b.decisions ? hm(b.average) : t('no decisions'), target: b.target })}>
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
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}><h3 style={{ margin: 0 }}>{t('Disbursed by product')}</h3><span className="xs muted">{t('TZS')}</span></div>
            <div className={s.bars}>
              {data.disbursedByProduct.length === 0 && <p className="muted small" style={{ margin: 0 }}>{t('Nothing disbursed yet.')}</p>}
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
  const t = useT();
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const has = (f) => def.filters.includes(f);
  const select = (k, label, items) => (
    <TextField select size="small" label={label} value={value[k]} onChange={set(k)}>
      <MenuItem value="">{t('All')}</MenuItem>
      {items.map((i) => <MenuItem key={i.value ?? i} value={i.value ?? i}>{i.label ?? i}</MenuItem>)}
    </TextField>
  );
  if (!def.filters.length) return null;
  return (
    <div className={s.filters}>
      {has('dates') && <TextField size="small" type="date" label={t('From')} value={value.from} onChange={set('from')} InputLabelProps={{ shrink: true }} />}
      {has('dates') && <TextField size="small" type="date" label={t('To')} value={value.to} onChange={set('to')} InputLabelProps={{ shrink: true }} />}
      {has('groupBy') && (
        <TextField select size="small" label={t('Group by')} value={value.groupBy} onChange={set('groupBy')}>
          <MenuItem value="product">{t('Product')}</MenuItem>
          <MenuItem value="branch">{t('Branch')}</MenuItem>
          <MenuItem value="category">{t('Category')}</MenuItem>
        </TextField>
      )}
      {has('product') && select('productId', t('Product'), options.products.map((p) => ({ value: p.id, label: p.name })))}
      {has('department') && select('department', t('Department'), options.departments)}
      {has('branch') && select('station', t('Branch'), options.branches)}
      {has('category') && select('category', t('Category'), options.categories.map((c) => ({ value: c, label: t(c) })))}
      {has('status') && select('status', t('Status'), options.statuses.map((x) => (typeof x === 'string' ? { value: x, label: t(x) } : { ...x, label: t(x.label) })))}
      {has('q') && <TextField size="small" label={t('Search')} value={value.q} onChange={set('q')} placeholder={t('User, action or reference')} />}
      {has('action') && <TextField size="small" label={t('Action starts with')} value={value.action} onChange={set('action')} placeholder={t('e.g. review.')} />}
    </div>
  );
}

function Cell({ value, column }) {
  const t = useT();
  if (value === 'Limited details') return <TableCell className={s.limited}>{t('Limited details')}</TableCell>;
  if (column.type === 'money') return <TableCell className={s.num}>{value === '' || value == null ? '' : formatNumber(value)}</TableCell>;
  if (column.type === 'number') return <TableCell className={s.num}>{value}</TableCell>;
  if (column.type === 'date') return <TableCell sx={{ whiteSpace: 'nowrap' }}>{value ? formatDate(value) : ''}</TableCell>;
  if (column.label.startsWith('Fingerprint')) return <TableCell><code className="xs" title={value}>{String(value).slice(0, 16)}…</code></TableCell>;
  return <TableCell sx={column.type === 'datetime' ? { whiteSpace: 'nowrap' } : undefined}>{value}</TableCell>;
}

function Report({ def, options }) {
  const t = useT();
  const [filters, setFilters] = useState(EMPTY);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Rows for the filters as they are now: an answer for earlier filters is dropped.
  useEffect(() => {
    setData(null);
    let current = true;
    const timer = setTimeout(() => {
      reportsApi
        .get(def.key, filters)
        .then((d) => {
          if (!current) return;
          setData(d);
          setError(null);
        })
        .catch((e) => current && setError(apiError(e).message));
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [def.key, filters]);

  const exportAs = (format) => reportsApi.exportFile(def.key, format, filters).catch((e) => setError(apiError(e).message));

  return (
    <Card>
      <div className="row" style={{ justifyContent: 'space-between', padding: '16px 16px 0' }}>
        <h3 style={{ margin: 0 }}>{def.id} {t(def.name)}</h3>
        {def.canExport && (
          <div className="row">
            <Button size="small" onClick={() => exportAs('csv')}>{t('CSV')}</Button>
            <Button size="small" onClick={() => exportAs('xlsx')}>{t('Excel')}</Button>
            <Button size="small" onClick={() => exportAs('pdf')}>{t('PDF')}</Button>
          </div>
        )}
      </div>
      <Filters def={def} options={options} value={filters} onChange={setFilters} />
      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
      {data && (data.limitedCount > 0 || data.excluded > 0 || data.truncated) && (
        <Alert severity="info" sx={{ m: 2, mb: 0 }}>
          {data.limitedCount > 0 && `${t(data.limitedCount === 1 ? '{n} management-route row shows limited details only.' : '{n} management-route rows show limited details only.', { n: data.limitedCount })} `}
          {data.excluded > 0 && `${t(data.excluded === 1 ? '{n} limited-details application is left out because the filter uses details you cannot see.' : '{n} limited-details applications are left out because the filter uses details you cannot see.', { n: data.excluded })} `}
          {data.truncated && t('Showing the first {n} of {total} rows; the export has them all.', { n: data.rows.length, total: data.total })}
        </Alert>
      )}
      {!data && !error && <p className="muted" role="status" style={{ padding: 16 }}>{t('Loading…')}</p>}
      {data && (
        <div className="tablewrap">
          <Table size="small" aria-label={t(def.name)}>
            <TableHead>
              <TableRow>{data.columns.map((c) => <TableCell key={c.label} className={c.type === 'money' || c.type === 'number' ? s.num : undefined}>{t(c.label)}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {data.rows.length === 0 && <TableRow><TableCell colSpan={data.columns.length} className="muted">{t('No rows for these filters.')}</TableCell></TableRow>}
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
  const t = useT();
  const permissions = useSelector((st) => st.auth.permissions);
  const canOverview = permissions.includes('reports.view');
  const [catalogue, setCatalogue] = useState(null);
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState(canOverview ? 'overview' : null);
  const [error, setError] = useState(null);

  useEffect(() => {
    reportsApi.catalogue().then((c) => { setCatalogue(c); setTab((cur) => cur || c.reports[0]?.key); }).catch((e) => setError(apiError(e).message));
    if (canOverview) reportsApi.overview().then(setOverview).catch((e) => setError(apiError(e).message));
  }, [canOverview]);

  const def = catalogue?.reports.find((r) => r.key === tab);
  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('Reports')}</h1>
          <p>{t('Exports open in Excel. Staff Loans covers applications up to disbursement; repayments are reported from core banking.')}</p>
        </div>
      </div>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {catalogue && (
        <Tabs value={tab || false} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }} aria-label={t('Reports')}>
          {canOverview && <Tab value="overview" label={t('Overview')} />}
          {catalogue.reports.map((r) => <Tab key={r.key} value={r.key} label={t(r.name)} />)}
        </Tabs>
      )}
      {tab === 'overview' && overview && <Overview data={overview} />}
      {def && <Report key={def.key} def={def} options={catalogue.options} />}
    </div>
  );
}
