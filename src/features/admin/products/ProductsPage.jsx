// Products and pricing (prototype #/admin/products, BRD 5.1). Every rule value lives
// here, never in code. Changes go through maker-checker (FR-58 to FR-63).

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, Button, Card, Chip, Link, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
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
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 24px', borderBottom: '1px solid var(--line-2)', flexWrap: 'wrap' }}>
        <div>
          <h3>{t('Pricing for all products')}</h3>
          {live && <span className="small muted">{t('Version {n}, in force since {date}', { n: live.version, date: formatDate(live.liveFrom) })}</span>}
        </div>
        <div className="row">
          <OpenChange change={pricing?.openChange} href={`/admin/pricing/versions/${pricing?.openChange?.id}`} />
          {canMake && !pricing?.openChange && <Button size="small" onClick={onChange}>{t('Change pricing')}</Button>}
        </div>
      </div>
      {live ? (
        <div style={{ padding: 24 }}>
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
          <h4 style={{ margin: '20px 0 8px' }}>{t('PAYE bands')}</h4>
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
          </div>
        </div>
      ) : (
        <div style={{ padding: 24 }} className="muted">{t('No pricing is in force.')}</div>
      )}
    </Card>
  );
}

export default function ProductsPage() {
  const t = useT();
  const navigate = useNavigate();
  const permissions = useSelector((st) => st.auth.permissions);
  const canMake = permissions.includes('products.make');
  const canCheck = permissions.includes('products.approveCredit') || permissions.includes('products.approveRisk');
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
    } catch (err) {
      setError(apiError(err).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const waiting = [
    ...rows.filter((r) => r.openChange?.state === 'pending_approval').map((r) => ({ label: `${r.name} (${r.code}) version ${r.openChange.version}`, href: `/admin/products/versions/${r.openChange.id}` })),
    ...(pricing?.openChange?.state === 'pending_approval' ? [{ label: t('Pricing version {n}', { n: pricing.openChange.version }), href: `/admin/pricing/versions/${pricing.openChange.id}` }] : []),
  ];

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
          <Alert severity="warning">
            <AlertTitle>{canCheck ? t('Waiting for your approval') : t('Waiting for a checker')}</AlertTitle>
            {waiting.map((w) => (
              <div key={w.href}>
                <Link component={RouterLink} to={w.href}>{w.label}</Link>
              </div>
            ))}
          </Alert>
        )}
        <Alert severity="warning">
          <AlertTitle>{t('Some product values are still samples')}</AlertTitle>
          {t('Amounts are confirmed: TZS 500,000 to 300,000,000 for every product. Tenor range and minimum service are sample values until confirmed from the Staff Loan Policy (BRD section 5).')}
        </Alert>
        {configuration && <Alert severity={configuration.enforcementEnabled && configuration.incomplete ? 'error' : 'info'}>
          <AlertTitle>{t('Product configuration readiness')}</AlertTitle>
          {configuration.ready} / {configuration.total} {t('live products ready')}. {configuration.incomplete} {t('require configuration')}.
          {' '}{configuration.enforcementEnabled ? t('Enforcement is active.') : t('Enforcement is not active. Existing products remain available until authorized activation.')}
        </Alert>}
        <PricingCard pricing={pricing} canMake={canMake} onChange={() => setDialog({ kind: 'pricing' })} />
        <Card>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
            <h3>{t('Products')}</h3>
          </div>
          <div className="tablewrap">
            <Table aria-label={t('Products')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Product')}</TableCell>
                  <TableCell align="right">{t('Min (TZS)')}</TableCell>
                  <TableCell align="right">{t('Max (TZS)')}</TableCell>
                  <TableCell>{t('Tenor (months)')}</TableCell>
                  <TableCell>{t('Min service')}</TableCell>
                  <TableCell>{t('Top-up')}</TableCell>
                  <TableCell>{t('Status')}</TableCell>
                  <TableCell>{t('Configuration')}</TableCell>
                  <TableCell>{t('Open change')}</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
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
                      <TableCell align="right" className="num">{v ? formatNumber(v.minAmount) : '—'}</TableCell>
                      <TableCell align="right" className="num">{v ? formatNumber(v.maxAmount) : '—'}</TableCell>
                      <TableCell>{v ? t('{min} to {max}', { min: v.minTenor, max: v.maxTenor }) : '—'}</TableCell>
                      <TableCell>{v ? `${v.minServiceMonths} m` : '—'}</TableCell>
                      <TableCell>{v ? (v.topUpAllowed ? t('Allowed') : t('No')) : '—'}</TableCell>
                      <TableCell><StateChip state={r.status} map={PRODUCT_STATUS} /></TableCell>
                      <TableCell>{r.configuration ? <Chip size="small" color={r.configuration.ready ? 'success' : 'warning'} label={t(r.configuration.ready ? 'Ready' : 'Configuration incomplete')} title={r.configuration.missing?.join(' ')} /> : '—'}</TableCell>
                      <TableCell><OpenChange change={r.openChange} href={`/admin/products/versions/${r.openChange?.id}`} /></TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {canMake && !r.openChange && r.status !== 'not_live' && (
                          <>
                            <Button size="small" onClick={() => setDialog({ kind: 'change', row: r })}>{t('Change')}</Button>{' '}
                            {r.status === 'active' && <Button size="small" onClick={() => setDialog({ kind: 'deactivate', row: r })}>{t('Deactivate')}</Button>}{' '}
                          </>
                        )}
                        <Button size="small" variant="text" component={RouterLink} to={`/admin/products/${r.id}`}>{t('History')}</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

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
