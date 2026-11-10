// Every product parameter from FR-57, edited by the maker. The API validates the
// same rules (FR-58); messages it returns are shown next to the fields.

import { useEffect, useState } from 'react';
import { productsApi } from '../../../api/products';
import { Alert, Button, Checkbox, FormControlLabel, FormGroup, IconButton, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import MoneyInput from '../../../components/MoneyInput';
import s from './products.module.css';
import { useT } from '../../../i18n';

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
  payslipLabel: '',
  contractStaffAllowed: false,
  eligibleCategories: ['Management', 'Non-management'],
  repaymentMethods: ['payroll'],
  fields: [],
  requiredDocuments: [],
  agreementTemplateId: null,
};

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
  const t = useT();
  const [agreementOptions, setAgreementOptions] = useState([]);
  const [agreementError, setAgreementError] = useState(null);
  useEffect(() => {
    productsApi.approvedAgreements().then(setAgreementOptions).catch(() => setAgreementError('Agreement options could not be loaded.'));
  }, []);
  const set = (k) => (v) => onChange({ ...values, [k]: v });
  const err = (k) => (errors[k] ? errors[k].join(' ') : undefined);
  const docErr = (i, field) => err(`requiredDocuments.${i}.${field}`);
  const num = (k, label, props = {}) => (
    <TextField
      label={t(label)}
      type="number"
      value={values[k] ?? ''}
      onChange={(e) => set(k)(e.target.value === '' ? null : Number(e.target.value))}
      error={!!errors[k]}
      helperText={err(k) || (props.hint && t(props.hint))}
      disabled={readOnly}
      inputProps={{ min: props.min ?? 0, step: props.step ?? 1, inputMode: 'decimal' }}
    />
  );
  const toggleIn = (k, item, on) => set(k)(on ? [...new Set([...(values[k] || []), item])] : (values[k] || []).filter((x) => x !== item));

  const moveDocument = (from, to) => {
    const docs = [...(values.requiredDocuments || [])];
    if (to < 0 || to >= docs.length) return;
    [docs[from], docs[to]] = [docs[to], docs[from]];
    set('requiredDocuments')(docs.map((d, i) => ({ ...d, displayOrder: i })));
  };
  const setDocument = (i, patch) => set('requiredDocuments')((values.requiredDocuments || []).map((d, j) => j === i ? { ...d, ...patch } : d));
  const setField = (i, patch) => set('fields')(values.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <div className={s.form}>
      <Section title={t('Product')}>
        <TextField label={t('Name')} required value={values.name} onChange={(e) => set('name')(e.target.value)} error={!!errors.name} helperText={err('name')} disabled={readOnly} />
        <TextField label={t('Description shown to staff')} value={values.description} onChange={(e) => set('description')(e.target.value)} disabled={readOnly} className={s.full} />
      </Section>

      <Section title={t('Limits')} hint={t('Amounts are whole shillings. The salary multiple and the affordability test still cap what each applicant can borrow.')}>
        <MoneyInput label={t('Minimum amount')} required value={values.minAmount} onChange={set('minAmount')} error={!!errors.minAmount} helperText={err('minAmount')} disabled={readOnly} />
        <MoneyInput label={t('Maximum amount')} required value={values.maxAmount} onChange={set('maxAmount')} error={!!errors.maxAmount} helperText={err('maxAmount')} disabled={readOnly} />
        {num('maxConcurrent', 'Running loans allowed', { min: 1 })}
        {num('minTenor', 'Minimum tenor (months)', { min: 1 })}
        {num('maxTenor', 'Maximum tenor (months)', { min: 1 })}
        {num('minServiceMonths', 'Minimum service (months)')}
        {num('reapplyCoolingMonths', 'Minimum number of Months Before Applying for Topup', { hint: 'Counted from the staff member\'s last successful application for this product.' })}
      </Section>

      <Section title={t('Eligibility')} hint={t('Every staff loan is repaid by salary deduction.')}>
        <FormGroup>
          <span className="small" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{t('Eligible employee categories')}</span>
          {['Non-management', 'Management'].map((c) => (
            <FormControlLabel key={c} label={t(c)} control={<Checkbox checked={values.eligibleCategories.includes(c)} onChange={(e) => toggleIn('eligibleCategories', c, e.target.checked)} disabled={readOnly} />} />
          ))}
          {errors.eligibleCategories && <span className="xs" style={{ color: 'var(--bad)', fontWeight: 600 }}>{err('eligibleCategories')}</span>}
        </FormGroup>
        <FormGroup>
          <FormControlLabel label={t('Top-up allowed')} control={<Checkbox checked={!!values.topUpAllowed} onChange={(e) => set('topUpAllowed')(e.target.checked)} disabled={readOnly} />} />
          <FormControlLabel label={t('Contract staff may apply')} control={<Checkbox checked={!!values.contractStaffAllowed} onChange={(e) => set('contractStaffAllowed')(e.target.checked)} disabled={readOnly} />} />
        </FormGroup>
        {/* D-101: the deduction's label on the payslip; required when top-ups are allowed. */}
        <TextField
          label={t('Payslip deduction label')}
          required={!!values.topUpAllowed}
          value={values.payslipLabel || ''}
          onChange={(e) => set('payslipLabel')(e.target.value)}
          error={!!errors.payslipLabel}
          helperText={err('payslipLabel') || t('As printed on the payslip, for example Staff Loan - Car. Each line is matched to its product by it; case, spacing and punctuation do not matter.')}
          disabled={readOnly}
          inputProps={{ maxLength: 80 }}
        />
      </Section>

      <section className={s.section}>
        <h3>{t('Required Documents')}</h3>
        <p className="small muted">{t('Configure document categories independently for this product.')}</p>
        {values.requiredDocuments === undefined && <Alert severity="warning">{t('Document requirements have not been configured for this version.')} {!readOnly && <Button size="small" onClick={() => set('requiredDocuments')([])}>{t('Confirm no additional documents required')}</Button>}</Alert>}
        {errors.requiredDocuments && <Alert severity="error">{err('requiredDocuments')}</Alert>}
        {(values.requiredDocuments || []).map((d, i) => (
          <div key={d.code + i} style={{ display: 'grid', gap: 8, padding: 12, border: '1px solid var(--line-2)', marginBottom: 12 }}>
            <TextField label={t('Document code')} size="small" value={d.code} disabled={readOnly} onChange={(e) => setDocument(i, { code: e.target.value })} error={!!docErr(i, 'code')} helperText={docErr(i, 'code') || t('Start with a lowercase letter; use lowercase letters, numbers and underscores only.')} />
            <TextField label={t('Document name')} size="small" value={d.name} disabled={readOnly} onChange={(e) => setDocument(i, { name: e.target.value })} error={!!docErr(i, 'name')} helperText={docErr(i, 'name')} />
            <TextField label={t('Instructions')} size="small" value={d.description || ''} disabled={readOnly} onChange={(e) => setDocument(i, { description: e.target.value })} />
            <FormControlLabel label={t('Mandatory')} control={<Checkbox checked={!!d.mandatory} disabled={readOnly} onChange={(e) => setDocument(i, { mandatory: e.target.checked, minFiles: e.target.checked ? Math.max(1, d.minFiles) : 0 })} />} />
            <TextField label={t('Minimum files')} type="number" size="small" value={d.minFiles} disabled={readOnly} onChange={(e) => setDocument(i, { minFiles: Number(e.target.value) })} error={!!docErr(i, 'minFiles')} helperText={docErr(i, 'minFiles')} />
            <TextField label={t('Maximum files')} type="number" size="small" value={d.maxFiles} disabled={readOnly} onChange={(e) => setDocument(i, { maxFiles: Number(e.target.value) })} error={!!docErr(i, 'maxFiles')} helperText={docErr(i, 'maxFiles')} />
            <TextField label={t('Allowed file types (comma separated)')} size="small" value={(d.allowedTypes || []).join(', ')} disabled={readOnly} onChange={(e) => setDocument(i, { allowedTypes: e.target.value.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean) })} error={!!docErr(i, 'allowedTypes')} helperText={docErr(i, 'allowedTypes')} />
            <TextField label={t('Maximum file size (MB)')} type="number" size="small" value={d.maxFileMb} disabled={readOnly} onChange={(e) => setDocument(i, { maxFileMb: Number(e.target.value) })} error={!!docErr(i, 'maxFileMb')} helperText={docErr(i, 'maxFileMb')} />
            <FormControlLabel label={t('Active')} control={<Checkbox checked={d.active !== false} disabled={readOnly} onChange={(e) => setDocument(i, { active: e.target.checked })} />} />
            {!readOnly && <div className="row"><Button disabled={i === 0} onClick={() => moveDocument(i, i - 1)}>{t('Move up')}</Button><Button disabled={i === (values.requiredDocuments || []).length - 1} onClick={() => moveDocument(i, i + 1)}>{t('Move down')}</Button><Button onClick={() => set('requiredDocuments')((values.requiredDocuments || []).filter((_, j) => i !== j))}>{t('Remove document')}</Button></div>}
          </div>
        ))}
        {!readOnly && <Button onClick={() => set('requiredDocuments')([...(values.requiredDocuments || []), { code: '', name: '', description: '', mandatory: false, minFiles: 0, maxFiles: 1, allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'], maxFileMb: 10, displayOrder: (values.requiredDocuments || []).length, active: true }])}>{t('Add document requirement')}</Button>}
      </section>
      <Section title="Loan Agreement" hint="Choose the legally approved agreement that applicants for this product must sign.">
        {agreementError && <Alert severity="warning">{agreementError}</Alert>}
        <TextField select fullWidth label={t('Approved loan agreement')} value={values.agreementTemplateId || ''} disabled={readOnly || !!agreementError} onChange={(e) => set('agreementTemplateId')(e.target.value || null)} helperText={err('agreementTemplateId') || t('A valid approved agreement is mandatory before configuration enforcement is activated.')} error={!!errors.agreementTemplateId}>
          <MenuItem value="">{t('Select a loan agreement')}</MenuItem>
          {values.agreementTemplateId && !agreementOptions.some((a) => a.id === values.agreementTemplateId) && (
            <MenuItem value={values.agreementTemplateId}>{t('Previously assigned agreement (not available for selection)')}</MenuItem>
          )}
          {agreementOptions.map((a) => <MenuItem key={a.id} value={a.id}>{a.version}{a.note ? ` — ${a.note}` : ''}</MenuItem>)}
        </TextField>
      </Section>
      <section className={s.section}>
        <h3>{t('Application fields')}</h3>
        <p className="small muted">{t('Extra questions this product asks on the application form.')}</p>
        <div className="tablewrap">
          <Table size="small" aria-label={t('Application fields')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('Key')}</TableCell>
                <TableCell>{t('Label')}</TableCell>
                <TableCell>{t('Type')}</TableCell>
                <TableCell>{t('Options (comma separated)')}</TableCell>
                <TableCell>{t('Mandatory')}</TableCell>
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
                      {FIELD_TYPES.map(([k, l]) => <MenuItem key={k} value={k}>{t(l)}</MenuItem>)}
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
                      <IconButton aria-label={t('Remove field {n}', { n: i + 1 })} onClick={() => set('fields')(values.fields.filter((_, j) => j !== i))}>
                        ×
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!values.fields.length && (
                <TableRow>
                  <TableCell colSpan={6} className="small muted">{t('No extra fields.')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {!readOnly && (
          <Button size="small" sx={{ mt: 1.5 }} onClick={() => set('fields')([...values.fields, { key: '', label: '', type: 'text', options: [], mandatory: false }])}>
            {t('Add field')}
          </Button>
        )}
      </section>
    </div>
  );
}
