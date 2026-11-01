// Every product parameter from FR-57, edited by the maker. The API validates the
// same rules (FR-58); messages it returns are shown next to the fields.

import { useEffect, useState } from 'react';
import { Button, Checkbox, FormControlLabel, FormGroup, IconButton, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import MoneyInput from '../../../components/MoneyInput';
import s from './products.module.css';

const FIELD_TYPES = [
  ['text', 'Short text'],
  ['textarea', 'Long text'],
  ['number', 'Number'],
  ['money', 'Amount (TZS)'],
  ['date', 'Date'],
  ['select', 'Choice list'],
];

export const EMPTY_PRODUCT = {
  name: '',
  description: '',
  minAmount: 500000,
  maxAmount: 300000000,
  minTenor: 1,
  maxTenor: 12,
  minServiceMonths: 6,
  maxConcurrent: 1,
  reapplyCoolingMonths: 6,
  topUpAllowed: false,
  contractStaffAllowed: false,
  eligibleCategories: ['Management', 'Non-management'],
  repaymentMethods: ['payroll', 'account'],
  requiredDocuments: [],
  optionalDocuments: [],
  fields: [],
  disbursementConditions: [],
};

const lines = (arr) => (arr || []).join('\n');
const toLines = (text) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/** One item per line; keeps the raw text while typing so new lines are not swallowed. */
function LinesField({ value, onChange, ...rest }) {
  const [text, setText] = useState(lines(value));
  useEffect(() => {
    if (toLines(text).join('\n') !== lines(value)) setText(lines(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <TextField
      {...rest}
      multiline
      minRows={2}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(toLines(e.target.value));
      }}
    />
  );
}

function Section({ title, hint, children }) {
  return (
    <section className={s.section}>
      <h3>{title}</h3>
      {hint && <p className="small muted">{hint}</p>}
      <div className={s.grid}>{children}</div>
    </section>
  );
}

export default function ProductForm({ values, onChange, errors = {}, readOnly }) {
  const set = (k) => (v) => onChange({ ...values, [k]: v });
  const err = (k) => (errors[k] ? errors[k].join(' ') : undefined);
  const num = (k, label, props = {}) => (
    <TextField
      label={label}
      type="number"
      value={values[k] ?? ''}
      onChange={(e) => set(k)(e.target.value === '' ? null : Number(e.target.value))}
      error={!!errors[k]}
      helperText={err(k) || props.hint}
      disabled={readOnly}
      inputProps={{ min: props.min ?? 0, step: props.step ?? 1, inputMode: 'decimal' }}
    />
  );
  const toggleIn = (k, item, on) => set(k)(on ? [...new Set([...(values[k] || []), item])] : (values[k] || []).filter((x) => x !== item));

  const setField = (i, patch) => set('fields')(values.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <div className={s.form}>
      <Section title="Product">
        <TextField label="Name" required value={values.name} onChange={(e) => set('name')(e.target.value)} error={!!errors.name} helperText={err('name')} disabled={readOnly} />
        <TextField label="Description shown to staff" value={values.description} onChange={(e) => set('description')(e.target.value)} disabled={readOnly} className={s.full} />
      </Section>

      <Section title="Limits" hint="Amounts are whole shillings. The salary multiple and the affordability test still cap what each applicant can borrow.">
        <MoneyInput label="Minimum amount" required value={values.minAmount} onChange={set('minAmount')} error={!!errors.minAmount} helperText={err('minAmount')} disabled={readOnly} />
        <MoneyInput label="Maximum amount" required value={values.maxAmount} onChange={set('maxAmount')} error={!!errors.maxAmount} helperText={err('maxAmount')} disabled={readOnly} />
        {num('maxConcurrent', 'Running loans allowed', { min: 1 })}
        {num('minTenor', 'Minimum tenor (months)', { min: 1 })}
        {num('maxTenor', 'Maximum tenor (months)', { min: 1 })}
        {num('minServiceMonths', 'Minimum service (months)')}
        {num('reapplyCoolingMonths', 'Months before applying for this product again', { hint: 'Counted from the last successful application.' })}
      </Section>

      <Section title="Eligibility and repayment">
        <FormGroup>
          <span className="small" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Eligible employee categories</span>
          {['Non-management', 'Management'].map((c) => (
            <FormControlLabel key={c} label={c} control={<Checkbox checked={values.eligibleCategories.includes(c)} onChange={(e) => toggleIn('eligibleCategories', c, e.target.checked)} disabled={readOnly} />} />
          ))}
          {errors.eligibleCategories && <span className="xs" style={{ color: 'var(--bad)', fontWeight: 600 }}>{err('eligibleCategories')}</span>}
        </FormGroup>
        <FormGroup>
          <span className="small" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Repayment methods</span>
          {[
            ['payroll', 'Payroll deduction'],
            ['account', 'Debit from staff account'],
          ].map(([k, label]) => (
            <FormControlLabel key={k} label={label} control={<Checkbox checked={values.repaymentMethods.includes(k)} onChange={(e) => toggleIn('repaymentMethods', k, e.target.checked)} disabled={readOnly} />} />
          ))}
          {errors.repaymentMethods && <span className="xs" style={{ color: 'var(--bad)', fontWeight: 600 }}>{err('repaymentMethods')}</span>}
        </FormGroup>
        <FormGroup>
          <FormControlLabel label="Top-up allowed" control={<Checkbox checked={!!values.topUpAllowed} onChange={(e) => set('topUpAllowed')(e.target.checked)} disabled={readOnly} />} />
          <FormControlLabel label="Contract staff may apply" control={<Checkbox checked={!!values.contractStaffAllowed} onChange={(e) => set('contractStaffAllowed')(e.target.checked)} disabled={readOnly} />} />
        </FormGroup>
      </Section>

      <Section title="Documents and conditions" hint="One per line. No document is mandatory at launch (decision 7).">
        <LinesField label="Required documents" value={values.requiredDocuments} onChange={set('requiredDocuments')} error={!!errors.requiredDocuments} helperText={err('requiredDocuments')} disabled={readOnly} />
        <LinesField label="Optional documents" value={values.optionalDocuments} onChange={set('optionalDocuments')} error={!!errors.optionalDocuments} helperText={err('optionalDocuments')} disabled={readOnly} />
        <LinesField label="Conditions OPS confirms before disbursement" value={values.disbursementConditions} onChange={set('disbursementConditions')} disabled={readOnly} className={s.full} />
      </Section>

      <section className={s.section}>
        <h3>Application fields</h3>
        <p className="small muted">Extra questions this product asks on the application form.</p>
        <div className="tablewrap">
          <Table size="small" aria-label="Application fields">
            <TableHead>
              <TableRow>
                <TableCell>Key</TableCell>
                <TableCell>Label</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Options (comma separated)</TableCell>
                <TableCell>Mandatory</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {values.fields.map((f, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <TableRow key={i}>
                  <TableCell sx={{ minWidth: 120 }}>
                    <TextField size="small" value={f.key} onChange={(e) => setField(i, { key: e.target.value })} error={!!errors[`fields.${i}.key`] || !!errors[`fields.${i}`]} helperText={(errors[`fields.${i}.key`] || []).join(' ')} inputProps={{ 'aria-label': `Field ${i + 1} key` }} disabled={readOnly} />
                  </TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    <TextField size="small" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} inputProps={{ 'aria-label': `Field ${i + 1} label` }} disabled={readOnly} />
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <TextField select size="small" value={f.type} onChange={(e) => setField(i, { type: e.target.value, options: e.target.value === 'select' ? f.options : [] })} inputProps={{ 'aria-label': `Field ${i + 1} type` }} disabled={readOnly}>
                      {FIELD_TYPES.map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    <TextField
                      size="small"
                      value={(f.options || []).join(', ')}
                      disabled={readOnly || f.type !== 'select'}
                      onChange={(e) => setField(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                      error={!!errors[`fields.${i}.options`]}
                      helperText={(errors[`fields.${i}.options`] || []).join(' ')}
                      inputProps={{ 'aria-label': `Field ${i + 1} options` }}
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={!!f.mandatory} onChange={(e) => setField(i, { mandatory: e.target.checked })} inputProps={{ 'aria-label': `Field ${i + 1} mandatory` }} disabled={readOnly} />
                  </TableCell>
                  <TableCell>
                    {!readOnly && (
                      <IconButton aria-label={`Remove field ${i + 1}`} onClick={() => set('fields')(values.fields.filter((_, j) => j !== i))}>
                        ×
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!values.fields.length && (
                <TableRow>
                  <TableCell colSpan={6} className="small muted">No extra fields.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {!readOnly && (
          <Button size="small" sx={{ mt: 1.5 }} onClick={() => set('fields')([...values.fields, { key: '', label: '', type: 'text', options: [], mandatory: false }])}>
            Add field
          </Button>
        )}
      </section>
    </div>
  );
}
