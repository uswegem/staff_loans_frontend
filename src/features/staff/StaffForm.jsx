// Employment details People and Culture maintain (FR-01). The same rules as the
// bulk upload apply on the server; its messages appear next to each field.

import { MenuItem, TextField } from '@mui/material';
import MoneyInput from '../../components/MoneyInput';
import s from './staff.module.css';

export const EMPTY_STAFF = {
  staffNo: '',
  firstName: '',
  middleName: '',
  lastName: '',
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
  retirementDate: '',
  email: '',
  workPhone: '',
  lfbAccountNo: '',
  mobile: '',
  salary: { basic: null, allowances: 0, commission: 0, effectiveFrom: '' },
};

export default function StaffForm({ values, onChange, errors = {}, isNew, readOnly }) {
  const set = (k) => (e) => onChange({ ...values, [k]: e.target.value });
  const err = (k) => errors[k]?.join(' ');
  const f = (k, label, { hint, ...props } = {}) => <TextField {...props} label={label} value={values[k] ?? ''} onChange={set(k)} error={!!errors[k]} helperText={err(k) || hint} disabled={readOnly} />;

  return (
    <div className={s.form}>
      <section>
        <h3>Person</h3>
        <div className={s.grid}>
          {isNew && f('staffNo', 'Staff number', { required: true, hint: 'The employee code on the payslip, for example AT637.', inputProps: { autoCapitalize: 'characters', maxLength: 12 } })}
          {f('firstName', 'First name', { required: true })}
          {f('middleName', 'Middle name')}
          {f('lastName', 'Last name', { required: true })}
          {f('email', 'Email', { type: 'email' })}
          {f('workPhone', 'Work phone', { type: 'tel' })}
          {isNew && f('mobile', 'Mobile phone', { type: 'tel', hint: 'The staff member keeps it up to date on their profile.' })}
        </div>
      </section>
      <section>
        <h3>Employment</h3>
        <div className={s.grid}>
          {f('title', 'Job title', { required: true })}
          {f('department', 'Department')}
          {f('station', 'Work station', { required: true, hint: 'Branch or Head Office.' })}
          {f('lineManagerStaffNo', 'Line manager staff number', { hint: 'Employee code, for example AT637' })}
          <TextField label="Head of station" value={values.stationHead?.name || ''} onChange={(e) => onChange({ ...values, stationHead: { ...values.stationHead, name: e.target.value } })} disabled={readOnly} />
          <TextField label="Head of station phone" type="tel" value={values.stationHead?.phone || ''} onChange={(e) => onChange({ ...values, stationHead: { ...values.stationHead, phone: e.target.value } })} disabled={readOnly} />
          {f('category', 'Employee category', {
            select: true,
            required: true,
            hint: 'Management: CEO and Heads of Operations, Credit, People and Culture, Finance, Risk, Legal, Audit and Business. Decides the approval route.',
            children: ['Non-management', 'Management'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>),
          })}
          {f('employmentType', 'Employment type', { select: true, required: true, children: ['Permanent', 'Probation', 'Contract'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>) })}
          {f('dateJoined', 'Date joined', { type: 'date', required: true })}
          {f('probationEndDate', 'Probation end date', { type: 'date', hint: 'Blank: the probation period in the settings, counted from the date joined.' })}
          {f('contractEndDate', 'Contract end date', { type: 'date', required: values.employmentType === 'Contract' })}
          {f('retirementDate', 'Retirement date', { type: 'date', required: true })}
          {f('lfbAccountNo', 'LFB account number', { hint: 'Fills in the staff member\'s bank details.' })}
        </div>
      </section>
      {isNew && (
        <section>
          <h3>Salary</h3>
          <div className={s.grid}>
            <MoneyInput label="Basic salary" required value={values.salary.basic} onChange={(v) => onChange({ ...values, salary: { ...values.salary, basic: v } })} error={!!errors['salary.basic']} helperText={err('salary.basic')} />
            <MoneyInput label="Allowances" value={values.salary.allowances} onChange={(v) => onChange({ ...values, salary: { ...values.salary, allowances: v } })} helperText="Not counted for affordability." />
            <TextField label="Salary effective from" type="date" required value={values.salary.effectiveFrom} onChange={(e) => onChange({ ...values, salary: { ...values.salary, effectiveFrom: e.target.value } })} error={!!errors['salary.effectiveFrom']} helperText={err('salary.effectiveFrom') || 'Usually the date joined.'} />
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
