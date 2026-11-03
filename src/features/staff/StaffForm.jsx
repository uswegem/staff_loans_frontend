// Employment details People and Culture maintain (FR-01). The same rules as the
// bulk upload apply on the server; its messages appear next to each field until the
// field is changed. Phone numbers are checked as they are typed (D-93).

import { useRef, useState } from 'react';
import { MenuItem, TextField } from '@mui/material';
import MoneyInput from '../../components/MoneyInput';
import PhoneField from '../../components/fields/PhoneField';
import { RULES, checkValue, useServerErrors } from '../../lib/validation';
import s from './staff.module.css';
import { useT } from '../../i18n';

export const EMPTY_STAFF = {
  staffNo: '',
  firstName: '',
  lastName: '',
  gender: '',
  title: '',
  department: '',
  station: '',
  stationHead: { name: '', phone: '' },
  lineManagerStaffNo: '',
  category: 'Non-management',
  employmentType: 'Permanent',
  dateJoined: '',
  probationEndDate: '',
  contractEndDate: '',
  email: '',
  workPhone: '',
  lfbAccountNo: '',
  mobile: '',
  salary: { basic: null, allowances: 0, commission: 0, effectiveFrom: '' },
};

export default function StaffForm({ values, onChange, errors = {}, isNew, readOnly }) {
  const t = useT();
  const set = (k) => (e) => onChange({ ...values, [k]: e?.target ? e.target.value : e });
  const server = useServerErrors(errors, values);
  // A phone's format is checked once the field is left (or for a saved number), then on every change.
  const start = useRef(values);
  const [left, setLeft] = useState({});
  const leave = (k) => () => setLeft((x) => (x[k] ? x : { ...x, [k]: true }));
  const phoneOf = (v, k) => (k === 'stationHead.phone' ? v?.stationHead?.phone : v?.[k]);
  const phoneErr = (k) => {
    const v = phoneOf(values, k);
    return left[k] || (v && v === phoneOf(start.current, k)) ? checkValue(v, { validate: RULES.phone }) : null;
  };
  const err = (k) => {
    const m = server(k) || (['workPhone', 'mobile', 'stationHead.phone'].includes(k) ? phoneErr(k) : null);
    return m ? t(m) : undefined;
  };
  const f = (k, label, { hint, ...props } = {}) => <TextField {...props} label={t(label)} value={values[k] ?? ''} onChange={set(k)} error={!!err(k)} helperText={err(k) || (hint && t(hint))} disabled={readOnly} />;
  const phone = (k, label, hint) => <PhoneField label={t(label)} value={values[k] ?? ''} onChange={set(k)} onBlur={leave(k)} error={!!err(k)} helperText={err(k) || (hint ? t(hint) : t('Optional.'))} disabled={readOnly} />;

  return (
    <div className={s.form}>
      <section>
        <h3>{t('Person')}</h3>
        <div className={s.grid}>
          {isNew && f('staffNo', 'Staff number', { required: true, hint: 'The employee code on the payslip, for example AT637.', inputProps: { autoCapitalize: 'characters', maxLength: 12 } })}
          {f('firstName', 'First name', { required: true })}
          {f('lastName', 'Surname', { required: true })}
          {f('gender', 'Gender', { select: true, hint: 'Leave blank if not known yet.', children: [['', 'Not recorded'], ['Male', 'Male'], ['Female', 'Female']].map(([v, l]) => <MenuItem key={l} value={v}>{t(l)}</MenuItem>) })}
          {f('email', 'Email', { type: 'email' })}
          {phone('workPhone', 'Work phone')}
          {isNew && phone('mobile', 'Mobile phone', 'The staff member keeps it up to date on their profile.')}
        </div>
      </section>
      <section>
        <h3>{t('Employment')}</h3>
        <div className={s.grid}>
          {f('title', 'Job title', { required: true })}
          {f('department', 'Department')}
          {f('station', 'Work station', { required: true, hint: 'Branch or Head Office.' })}
          {f('lineManagerStaffNo', 'Line manager staff number', { hint: 'Employee code, for example AT637' })}
          <TextField label={t('Head of station')} value={values.stationHead?.name || ''} onChange={(e) => onChange({ ...values, stationHead: { ...values.stationHead, name: e.target.value } })} disabled={readOnly} />
          <PhoneField label={t('Head of station phone')} value={values.stationHead?.phone || ''} onChange={(v) => onChange({ ...values, stationHead: { ...values.stationHead, phone: v } })} onBlur={leave('stationHead.phone')} error={!!err('stationHead.phone')} helperText={err('stationHead.phone') || t('Optional.')} disabled={readOnly} />
          {f('category', 'Employee category', {
            select: true,
            required: true,
            hint: 'Management: CEO and Heads of Operations, Credit, People and Culture, Finance, Risk, Legal, Audit and Business. Decides the approval route.',
            children: ['Non-management', 'Management'].map((c) => <MenuItem key={c} value={c}>{t(c)}</MenuItem>),
          })}
          {f('employmentType', 'Employment type', { select: true, required: true, children: ['Permanent', 'Probation', 'Contract'].map((c) => <MenuItem key={c} value={c}>{t(c)}</MenuItem>) })}
          {f('dateJoined', 'Date joined', { type: 'date', required: true })}
          {f('probationEndDate', 'Probation end date', { type: 'date', hint: 'Blank: the probation period in the settings, counted from the date joined.' })}
          {f('contractEndDate', 'Contract end date', { type: 'date', required: values.employmentType === 'Contract' })}
          {f('lfbAccountNo', 'LFB account number', { hint: 'Fills in the staff member\'s bank details.' })}
        </div>
      </section>
      {isNew && (
        <section>
          <h3>{t('Salary')}</h3>
          <div className={s.grid}>
            <MoneyInput label={t('Basic salary')} required value={values.salary.basic} onChange={(v) => onChange({ ...values, salary: { ...values.salary, basic: v } })} error={!!err('salary.basic')} helperText={err('salary.basic')} />
            <MoneyInput label={t('Allowances')} value={values.salary.allowances} onChange={(v) => onChange({ ...values, salary: { ...values.salary, allowances: v } })} helperText={t('Not counted for affordability.')} />
            <TextField label={t('Salary effective from')} type="date" required value={values.salary.effectiveFrom} onChange={(e) => onChange({ ...values, salary: { ...values.salary, effectiveFrom: e.target.value } })} error={!!err('salary.effectiveFrom')} helperText={err('salary.effectiveFrom') || t('Usually the date joined.')} />
          </div>
        </section>
      )}
    </div>
  );
}

/** Turns form values into the API body: blanks become null or are dropped. */
export function toBody(values, { isNew }) {
  const body = { ...values };
  ['probationEndDate', 'contractEndDate'].forEach((k) => {
    if (!body[k]) body[k] = null;
  });
  if (!body.lineManagerStaffNo) body.lineManagerStaffNo = null;
  if (!isNew) {
    delete body.staffNo;
    delete body.salary;
    delete body.mobile;
  } else {
    body.salary = { ...body.salary, allowances: body.salary.allowances || 0, commission: body.salary.commission || 0 };
  }
  return body;
}
