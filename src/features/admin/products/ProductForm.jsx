// Every product parameter from FR-57, edited by the maker. The API validates the
// same rules (FR-58); messages it returns are shown next to the fields.

import { useEffect, useRef, useState } from 'react';
import { productsApi } from '../../../api/products';
import { Alert, Button, Checkbox, FormControlLabel, FormGroup, IconButton, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Link } from '@mui/material';
import MoneyInput from '../../../components/MoneyInput';
import s from './products.module.css';
import { useT } from '../../../i18n';
import { Link as RouterLink } from 'react-router-dom';

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

/** A document code from its name: "Photos of the car" → "photos_of_the_car" (the API's format). */
export function codeFrom(name, taken) {
  let base = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36);
  if (!base) return '';
  if (!/^[a-z]/.test(base)) base = `doc_${base}`.slice(0, 36);
  let code = base;
  for (let n = 2; taken.has(code); n += 1) code = `${base}_${n}`;
  return code;
}

/** A field key from its label: "Make and model" → "makeAndModel" (the API's format). */
export function keyFrom(label, taken) {
  const words = String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  let base = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join('').slice(0, 28);
  if (!base) return '';
  if (!/^[a-z]/.test(base)) base = `f${base}`.slice(0, 28);
  let key = base;
  for (let n = 2; taken.has(key); n += 1) key = `${base}${n}`;
  return key;
}

// File types offered as checkboxes; JPG covers .jpeg too.
const FILE_TYPES = [['pdf', ['pdf'], 'PDF'], ['jpg', ['jpg', 'jpeg'], 'JPG'], ['png', ['png'], 'PNG']];

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
  // Codes and keys that existed when the form opened are never changed: stored documents and
  // answers refer to them. Only requirements and fields added now get one made from the name.
  const savedCodes = useRef(new Set((values.requiredDocuments || []).map((d) => d.code).filter(Boolean)));
  const savedKeys = useRef(new Set((values.fields || []).map((f) => f.key).filter(Boolean)));
  const setDocument = (i, patch) => set('requiredDocuments')((values.requiredDocuments || []).map((d, j) => {
    if (j !== i) return d;
    const next = { ...d, ...patch };
    if ('name' in patch && !savedCodes.current.has(d.code)) {
      const taken = new Set((values.requiredDocuments || []).filter((_, k) => k !== i).map((x) => x.code));
      next.code = codeFrom(patch.name, taken);
    }
    return next;
  }));
  const setField = (i, patch) => set('fields')(values.fields.map((f, j) => {
    if (j !== i) return f;
    const next = { ...f, ...patch };
    if ('label' in patch && !savedKeys.current.has(f.key)) {
      const taken = new Set(values.fields.filter((_, k) => k !== i).map((x) => x.key));
      next.key = keyFrom(patch.label, taken);
    }
    return next;
  }));
  const typesOf = (d) => FILE_TYPES.filter(([, exts]) => exts.some((x) => (d.allowedTypes || []).includes(x)));
  const toggleType = (i, d, exts, on) => {
    const cur = new Set(d.allowedTypes || []);
    exts.forEach((x) => (on ? cur.add(x) : cur.delete(x)));
    setDocument(i, { allowedTypes: [...cur] });
  };

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
        {num('reapplyCoolingMonths', 'Months before a top-up', { hint: 'Counted from the staff member\'s last successful application for this product.' })}
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
        <h3>{t('Required documents')}</h3>
        <p className="small muted">{t('Configure document categories independently for this product.')}</p>
        {values.requiredDocuments === undefined && <Alert severity="warning">{t('Document requirements have not been configured for this version.')} {!readOnly && <Button size="small" onClick={() => set('requiredDocuments')([])}>{t('Confirm no additional documents required')}</Button>}</Alert>}
        {errors.requiredDocuments && <Alert severity="error">{err('requiredDocuments')}</Alert>}
        {(values.requiredDocuments || []).map((d, i) => (
          // Keyed by position: the code changes as a new requirement's name is typed.
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} style={{ display: 'grid', gap: 8, padding: 12, border: '1px solid var(--line-2)', marginBottom: 12 }}>
            {/* The document code is made from the name (and never changed once saved); its errors show here. */}
            <TextField label={t('Document name')} size="small" value={d.name} disabled={readOnly} onChange={(e) => setDocument(i, { name: e.target.value })} error={!!docErr(i, 'name') || !!docErr(i, 'code')} helperText={docErr(i, 'name') || docErr(i, 'code')} />
            <TextField label={t('Instructions')} size="small" value={d.description || ''} disabled={readOnly} onChange={(e) => setDocument(i, { description: e.target.value })} />
            <FormControlLabel label={t('Mandatory')} control={<Checkbox checked={!!d.mandatory} disabled={readOnly} onChange={(e) => setDocument(i, { mandatory: e.target.checked, minFiles: e.target.checked ? Math.max(1, d.minFiles) : 0 })} />} />
            <TextField label={t('Minimum files')} type="number" size="small" value={d.minFiles} disabled={readOnly} onChange={(e) => setDocument(i, { minFiles: Number(e.target.value) })} error={!!docErr(i, 'minFiles')} helperText={docErr(i, 'minFiles')} />
            <TextField label={t('Maximum files')} type="number" size="small" value={d.maxFiles} disabled={readOnly} onChange={(e) => setDocument(i, { maxFiles: Number(e.target.value) })} error={!!docErr(i, 'maxFiles')} helperText={docErr(i, 'maxFiles')} />
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="small" style={{ fontWeight: 600 }}>{t('Allowed file types')}</legend>
              {FILE_TYPES.map(([k, exts, label]) => (
                <FormControlLabel key={k} label={label} control={<Checkbox checked={typesOf(d).some(([x]) => x === k)} disabled={readOnly} onChange={(e) => toggleType(i, d, exts, e.target.checked)} />} />
              ))}
              {docErr(i, 'allowedTypes') && <div className="xs" style={{ color: 'var(--bad)' }}>{docErr(i, 'allowedTypes')}</div>}
            </fieldset>
            <TextField label={t('Maximum file size (MB)')} type="number" size="small" value={d.maxFileMb} disabled={readOnly} onChange={(e) => setDocument(i, { maxFileMb: Number(e.target.value) })} error={!!docErr(i, 'maxFileMb')} helperText={docErr(i, 'maxFileMb')} />
            <FormControlLabel label={t('Active')} control={<Checkbox checked={d.active !== false} disabled={readOnly} onChange={(e) => setDocument(i, { active: e.target.checked })} />} />
            {!readOnly && <div className="row"><Button disabled={i === 0} onClick={() => moveDocument(i, i - 1)}>{t('Move up')}</Button><Button disabled={i === (values.requiredDocuments || []).length - 1} onClick={() => moveDocument(i, i + 1)}>{t('Move down')}</Button><Button onClick={() => set('requiredDocuments')((values.requiredDocuments || []).filter((_, j) => i !== j))}>{t('Remove document')}</Button></div>}
          </div>
        ))}
        {!readOnly && <Button onClick={() => set('requiredDocuments')([...(values.requiredDocuments || []), { code: '', name: '', description: '', mandatory: true, minFiles: 1, maxFiles: 1, allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'], maxFileMb: 10, displayOrder: (values.requiredDocuments || []).length, active: true }])}>{t('Add document requirement')}</Button>}
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
        {!agreementError && !agreementOptions.length && (
          <p className="small" style={{ margin: 0 }}>{t('No agreement is approved yet.')} <Link component={RouterLink} to="/admin/templates">{t('Go to Agreement templates')}</Link></p>
        )}
      </Section>
      <section className={s.section}>
        <h3>{t('Application fields')}</h3>
        <p className="small muted">{t('Extra questions this product asks on the application form.')}</p>
        <div className="tablewrap">
          <Table size="small" aria-label={t('Application fields')}>
            <TableHead>
              <TableRow>
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
                  <TableCell sx={{ minWidth: 200 }}>
                    {/* The key is made from the label for a new field; its errors show here. */}
                    <TextField size="small" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} error={!!errors[`fields.${i}.key`] || !!errors[`fields.${i}`]} helperText={(errors[`fields.${i}.key`] || []).join(' ')} inputProps={{ 'aria-label': `Field ${i + 1} label` }} disabled={readOnly} />
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
                  <TableCell colSpan={5} className="small muted">{t('No extra fields.')}</TableCell>
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
