// Global pricing (BR-14, BR-15, BRD 10). Rates are shown as percentages and stored
// as whole basis points; PAYE bands are a table.

import { Button, IconButton, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, InputAdornment } from '@mui/material';
import MoneyInput from '../../../components/MoneyInput';
import s from './products.module.css';
import { useT } from '../../../i18n';

const RATES = [
  ['interestBps', 'Interest a year, reducing balance'],
  ['affordabilityBps', 'Instalment limit, of adjusted net pay'],
  ['processingFeeBps', 'Processing fee, new loan'],
  ['processingFeeTopUpBps', 'Processing fee, top-up'],
  ['insuranceBps', 'Insurance a year, pro-rata, one-off'],
  ['pensionBps', 'Pension, of basic salary'],
];

const toBps = (text) => (text === '' ? null : Math.round(Number.parseFloat(text) * 100));
const fromBps = (bps) => (bps == null ? '' : String(bps / 100));

export default function PricingForm({ values, onChange, errors = {}, readOnly }) {
  const t = useT();
  const set = (k, v) => onChange({ ...values, [k]: v });
  const err = (k) => (errors[k] ? errors[k].join(' ') : undefined);
  const setBand = (i, patch) => set('payeBands', values.payeBands.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  return (
    <div className={s.form}>
      <section className={s.section}>
        <h3>{t('Rates for all products')}</h3>
        <div className={s.grid}>
          {RATES.map(([k, label]) => (
            <TextField
              key={k}
              label={t(label)}
              type="number"
              value={fromBps(values[k])}
              onChange={(e) => set(k, toBps(e.target.value))}
              error={!!errors[k]}
              helperText={err(k)}
              disabled={readOnly}
              inputProps={{ step: 0.01, min: 0, inputMode: 'decimal' }}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            />
          ))}
          <TextField select label={t('Instalment rounded up to')} value={values.instalmentRounding} onChange={(e) => set('instalmentRounding', Number(e.target.value))} disabled={readOnly} error={!!errors.instalmentRounding} helperText={err('instalmentRounding')}>
            {[1, 10, 100, 1000].map((n) => <MenuItem key={n} value={n}>{`TZS ${n.toLocaleString('en-US')}`}</MenuItem>)}
          </TextField>
        </div>
      </section>
      <section className={s.section}>
        <h3>{t('PAYE bands')}</h3>
        <p className="small muted">{t('PAYE = base + rate × (taxable pay − from), using the highest band the taxable pay reaches.')}</p>
        {errors.payeBands && <p className="xs" style={{ color: 'var(--bad)', fontWeight: 600 }}>{err('payeBands')}</p>}
        <div className="tablewrap">
          <Table size="small" aria-label={t('PAYE bands')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('Taxable pay from')}</TableCell>
                <TableCell>{t('Base')}</TableCell>
                <TableCell>{t('Rate on excess')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {values.payeBands.map((b, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <TableRow key={i}>
                  <TableCell sx={{ minWidth: 180 }}>
                    <MoneyInput size="small" value={b.from} onChange={(v) => setBand(i, { from: v ?? 0 })} disabled={readOnly} inputProps={{ 'aria-label': `Band ${i + 1} from` }} error={!!errors[`payeBands.${i}`]} helperText={(errors[`payeBands.${i}`] || []).join(' ')} />
                  </TableCell>
                  <TableCell sx={{ minWidth: 180 }}>
                    <MoneyInput size="small" value={b.base} onChange={(v) => setBand(i, { base: v ?? 0 })} disabled={readOnly} inputProps={{ 'aria-label': `Band ${i + 1} base` }} />
                  </TableCell>
                  <TableCell sx={{ minWidth: 130 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={fromBps(b.rateBps)}
                      onChange={(e) => setBand(i, { rateBps: toBps(e.target.value) ?? 0 })}
                      disabled={readOnly}
                      inputProps={{ step: 0.01, min: 0, 'aria-label': `Band ${i + 1} rate` }}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    />
                  </TableCell>
                  <TableCell>
                    {!readOnly && i > 0 && (
                      <IconButton aria-label={t('Remove band {n}', { n: i + 1 })} onClick={() => set('payeBands', values.payeBands.filter((_, j) => j !== i))}>×</IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!readOnly && (
          <Button size="small" sx={{ mt: 1.5 }} onClick={() => set('payeBands', [...values.payeBands, { from: (values.payeBands.at(-1)?.from || 0) + 100000, base: 0, rateBps: 0 }])}>
            {t('Add band')}
          </Button>
        )}
      </section>
    </div>
  );
}
