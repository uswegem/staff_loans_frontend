// Products and pricing (prototype #/admin/products, BRD 5.1). Every rule value lives
// here, never in code. Changes go through maker-checker (FR-58 to FR-63).

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, Chip, Collapse, Link, Menu, MenuItem, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { productsApi } from '../../../api/products';
import { apiError } from '../../../api/client';
import { formatDate, formatNumber } from '../../../lib/format';
import { pct } from '../../../lib/dates';
import StateChip, { PRODUCT_STATUS } from '../../../components/StateChip';
import ChangeDialog from './ChangeDialog';
import s from './products.module.css';
import { useT } from '../../../i18n';

function OpenChange({ change, href }) {
  if (!change) return null;
  return (
    <Link component={RouterLink} to={href} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <StateChip state={change.state} /> <span className="small">v{change.version}{change.changeType === 'deactivate' ? ', deactivation' : ''}</span>
    </Link>
  );
}

function PricingCard({ pricing, canMake, onChange }) {
  const t = useT();
  const live = pricing?.live;
  const [expanded, setExpanded] = useState(false);
  const [pricingTab, setPricingTab] = useState(0);
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 24px', borderBottom: '1px solid var(--line-2)', flexWrap: 'wrap' }}>
        <div>
          <h3>{t('Global pricing & PAYE')}</h3>
          {live && <span className="small muted">{t('Version {n}, in force since {date}', { n: live.version, date: formatDate(live.liveFrom) })}</span>}
        </div>
        <div className="row">
          <Button size="small" aria-expanded={expanded} aria-controls="global-pricing-content" onClick={() => setExpanded((value) => !value)}>{expanded ? t('Collapse') : t('Expand')}</Button>
          <OpenChange change={pricing?.openChange} href={`/admin/pricing/versions/${pricing?.openChange?.id}`} />
          {canMake && !pricing?.openChange && <Button size="small" onClick={onChange}>{t('Change pricing')}</Button>}
        </div>
      </div>
      <Collapse in={expanded} id="global-pricing-content">
      {live ? (
        <div style={{ padding: 24 }}>
          <Tabs value={pricingTab} onChange={(_, value) => setPricingTab(value)} aria-label={t('Global pricing sections')} sx={{ mb: 2 }}><Tab label={t('Pricing parameters')} /><Tab label={t('PAYE bands')} /></Tabs>
          {pricingTab === 0 && <>
          <div className={s.figures}>
            {[
              [pct(live.interestBps), 'Interest a year, reducing balance'],
              [`${pct(live.processingFeeBps)} / ${pct(live.processingFeeTopUpBps)}`, 'Processing fee, new loan / top-up'],
              [pct(live.insuranceBps), 'Insurance a year, pro-rata, one-off'],
              [pct(live.affordabilityBps, 0), 'Instalment limit, of adjusted net pay'],
              [pct(live.pensionBps, 0), 'Pension, of basic salary'],
              [`TZS ${formatNumber(live.instalmentRounding)}`, 'Instalment rounded up to'],
            ].map(([v, l]) => (
              <div key={l} className={s.figure}>
                <div className={s.v}>{v}</div>
                <div className={s.l}>{t(l)}</div>
              </div>
            ))}
          </div>
          </>}
          {pricingTab === 1 && <><h4 style={{ margin: '20px 0 8px' }}>{t('PAYE bands')}</h4>
          <div className="tablewrap">
            <Table size="small" aria-label={t('PAYE bands in force')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Taxable pay from (TZS)')}</TableCell>
                  <TableCell align="right">{t('Base (TZS)')}</TableCell>
                  <TableCell align="right">{t('Rate on excess')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {live.payeBands.map((b) => (
                  <TableRow key={b.from}>
                    <TableCell className="num">{formatNumber(b.from)}</TableCell>
                    <TableCell align="right" className="num">{formatNumber(b.base)}</TableCell>
                    <TableCell align="right">{pct(b.rateBps, 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div></>}
        </div>
      ) : (
        <div style={{ padding: 24 }} className="muted">{t('No pricing is in force.')}</div>
      )}
      </Collapse>
    </Card>
  );
}

export default function ProductsPage() {
  const t = useT();
  const navigate = useNavigate();
  const permissions = useSelector((st) => st.auth.permissions);
  const canMake = permissions.includes('products.make');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [readinessFilter, setReadinessFilter] = useState('all');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [rows, setRows] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [configuration, setConfiguration] = useState(null);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, pr, config] = await Promise.all([productsApi.adminList(), productsApi.pricing(), productsApi.readiness()]);
      setRows(p);
      setPricing(pr);
      setConfiguration(config);
      setError(null);
    } catch (err) {
      setError(apiError(err).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const waiting = [
    ...rows.filter((r) => r.openChange?.canCheck).map((r) => ({ label: `${r.name} (${r.code}) version ${r.openChange.version}`, href: `/admin/products/versions/${r.openChange.id}` })),
    ...(pricing?.openChange?.canCheck ? [{ label: t('Pricing version {n}', { n: pricing.openChange.version }), href: `/admin/pricing/versions/${pricing.openChange.id}` }] : []),
  ];

  const filteredRows = rows.filter((r) => {
    const matchesSearch = `${r.name || ''} ${r.code}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'pending' ? r.openChange?.state === 'pending_approval' : r.status === statusFilter);
    const matchesReadiness = readinessFilter === 'all' || (readinessFilter === 'ready' ? r.configuration?.ready : r.configuration && !r.configuration.ready);
    return matchesSearch && matchesStatus && matchesReadiness;
  });

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1>{t('Products and pricing')}</h1>
          <p>{t('Every rule value lives here, never in code. A maker prepares each change and a different person, the checker, approves it.')}</p>
        </div>
        {canMake && <Button variant="contained" component={RouterLink} to="/admin/products/new">{t('New product')}</Button>}
      </div>
      <div className="stack">
        {error && <Alert severity="error">{error}</Alert>}
        {waiting.length > 0 && (
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <h3>{t('Approval center')}</h3>
              <Chip color="warning" size="small" label={t('{count} awaiting your review', { count: waiting.length })} />
            </Box>
            <p className="small muted">{t('Only changes you can approve at the current stage appear here.')}</p>
            {waiting.map((w) => (
              <Box key={w.href} sx={{ py: 1, display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>{w.label}</span>
                <Button variant="outlined" size="small" component={RouterLink} to={w.href} aria-label={t('Review changes to {item}', { item: w.label })}>{t('Review changes')}</Button>
              </Box>
            ))}
          </Card>
        )}
        {configuration && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip size="small" variant="outlined" label={t('{ready} of {total} products ready', { ready: configuration.ready, total: configuration.total })} />
          {configuration.incomplete > 0 && <Button size="small" onClick={() => setReadinessFilter('incomplete')}>{t('{count} need configuration', { count: configuration.incomplete })}</Button>}
        </Box>}

        <Card>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}><h3>{t('Loan products')}</h3><Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}><TextField size="small" label={t('Search products')} value={search} onChange={(e) => setSearch(e.target.value)} /><TextField select size="small" label={t('Workflow')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 150 }}><MenuItem value="all">{t('All statuses')}</MenuItem><MenuItem value="active">{t('Active')}</MenuItem><MenuItem value="pending">{t('Pending approval')}</MenuItem><MenuItem value="inactive">{t('Inactive')}</MenuItem><MenuItem value="not_live">{t('Not live')}</MenuItem></TextField><TextField select size="small" label={t('Readiness')} value={readinessFilter} onChange={(e) => setReadinessFilter(e.target.value)} sx={{ minWidth: 145 }}><MenuItem value="all">{t('All readiness')}</MenuItem><MenuItem value="ready">{t('Ready')}</MenuItem><MenuItem value="incomplete">{t('Needs setup')}</MenuItem></TextField></Box></Box>
          </div>
          <div className="tablewrap">
            <Table aria-label={t('Products')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Product')}</TableCell>
                  <TableCell>{t('Workflow')}</TableCell>
                  <TableCell>{t('Readiness')}</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((r) => {
                  const v = r.live;
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <b>{r.name}</b>
                        <div className="xs muted">
                          {r.code}
                          {v ? `, version ${v.version}` : ''}
                          {r.scheduled ? `; version ${r.scheduled.version} from ${formatDate(r.scheduled.liveFrom)}` : ''}
                        </div>
                      </TableCell>
                      <TableCell>{r.openChange?.state === 'pending_approval' ? <Chip size="small" color="warning" label={r.openChange.stageLabel ? t('Awaiting {stage}', { stage: r.openChange.stageLabel }) : t('Pending approval')} /> : <StateChip state={r.status} map={PRODUCT_STATUS} />}</TableCell>
                      <TableCell>{r.configuration ? <span title={r.configuration.missing?.join(' ')}>{t(r.configuration.ready ? 'Ready' : 'Needs setup')}</span> : '—'}</TableCell>
                      <TableCell align="right">
                        <Button size="small" aria-label={t('Actions for {name}', { name: r.name })} onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuRow(r); }}>{t('Actions')}</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
        <PricingCard pricing={pricing} canMake={canMake} onChange={() => setDialog({ kind: 'pricing' })} />
      </div>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem component={RouterLink} to={menuRow ? `/admin/products/${menuRow.id}` : '#'} onClick={() => setMenuAnchor(null)}>{t('View change history')}</MenuItem>
        {menuRow?.openChange && <MenuItem component={RouterLink} to={`/admin/products/versions/${menuRow.openChange.id}`} onClick={() => setMenuAnchor(null)}>{t('View open change')}</MenuItem>}
        {canMake && menuRow && !menuRow.openChange && menuRow.status !== 'not_live' && <MenuItem onClick={() => { setDialog({ kind: 'change', row: menuRow }); setMenuAnchor(null); }}>{t('Change product')}</MenuItem>}
        {canMake && menuRow?.status === 'active' && !menuRow.openChange && <MenuItem onClick={() => { setDialog({ kind: 'deactivate', row: menuRow }); setMenuAnchor(null); }}>{t('Deactivate')}</MenuItem>}
      </Menu>

      {dialog?.kind === 'pricing' && (
        <ChangeDialog
          title={t('Change pricing')}
          intro={t('Starts a draft of the pricing in force. You edit it next, then submit it to a checker.')}
          action={t('Start draft')}
          onClose={() => setDialog(null)}
          onCreate={async (body) => {
            const v = await productsApi.pricingDraft(body);
            navigate(`/admin/pricing/versions/${v.id}`);
          }}
        />
      )}
      {dialog?.kind === 'change' && (
        <ChangeDialog
          title={t('Change {name}', { name: dialog.row.name })}
          intro={t('Starts a draft from the latest approved version. You edit it next, then submit it to a checker.')}
          action={t('Start draft')}
          onClose={() => setDialog(null)}
          onCreate={async (body) => {
            const v = await productsApi.createDraft(dialog.row.id, { ...body, changeType: 'change' });
            navigate(`/admin/products/versions/${v.id}`);
          }}
        />
      )}
      {dialog?.kind === 'deactivate' && (
        <ChangeDialog
          title={t('Deactivate {name}', { name: dialog.row.name })}
          intro={t('From the effective date the product is hidden from new applications. Applications already in progress continue. A checker must approve this.')}
          action={t('Start deactivation')}
          onClose={() => setDialog(null)}
          onCreate={async (body) => {
            const v = await productsApi.createDraft(dialog.row.id, { ...body, changeType: 'deactivate' });
            navigate(`/admin/products/versions/${v.id}`);
          }}
        />
      )}
    </div>
  );
}
