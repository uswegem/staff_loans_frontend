// One validation behaviour for every form (D-93):
// - a red border only when a required field is empty or a value fails its format;
// - the normal border as soon as the value meets the rule, while the person types;
// - a message that says what is wrong ("Enter nine digits after +255…"), and the
//   required message only for an empty field;
// - an error returned by the server shows until that field is changed.

import { useCallback, useMemo, useRef, useState } from 'react';
import { ACCOUNT_NO, ACCOUNT_NO_MESSAGE, BRANCH_MESSAGE, NIDA_MESSAGE, PHONE_MESSAGE, isNida, isPhone } from './formats';

const empty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * rule: { required?, requiredMessage?, validate?(value) → message | null }
 * Returns the message for the value, or null when it is fine.
 */
export function checkValue(value, rule = {}) {
  if (empty(value)) return rule.required ? rule.requiredMessage || 'This field is required.' : null;
  return rule.validate ? rule.validate(value) || null : null;
}

/** Reusable format rules. */
export const RULES = {
  nida: (v) => (isNida(v) ? null : NIDA_MESSAGE),
  phone: (v) => (isPhone(v) ? null : PHONE_MESSAGE),
  accountNo: (v) => (ACCOUNT_NO.test(String(v).trim()) ? null : ACCOUNT_NO_MESSAGE),
  branch: (v) => (/[A-Za-z].*[A-Za-z]/.test(v) ? null : BRANCH_MESSAGE),
};

const getPath = (o, p) => String(p).split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const joined = (m) => (Array.isArray(m) ? m.join(' ') : m);

/**
 * Server errors ({ field: message | [messages] }) that stop showing once the field's
 * value changes from what was sent. values is the form's current state.
 */
export function useServerErrors(errors, values) {
  const sent = useRef({ errors: null, values: null });
  if (sent.current.errors !== errors) sent.current = { errors, values };
  return useCallback(
    (k) => {
      const m = errors?.[k];
      if (!m) return undefined;
      return getPath(sent.current.values, k) === getPath(values, k) ? joined(m) : undefined;
    },
    [errors, values]
  );
}

/**
 * Form state with rules checked on every change.
 * rules: { field: rule } (see checkValue). Returns
 * { values, set(k) → onChange handler, setValues, errorOf(k), setServerErrors, invalid }.
 */
export function useValidatedForm(initial, rules = {}) {
  const [values, setValues] = useState(initial);
  const [server, setServer] = useState({});
  const set = useCallback(
    (k) => (e) => {
      const v = e?.target ? e.target.value : e;
      setValues((x) => ({ ...x, [k]: v }));
      setServer((s) => {
        if (!s[k]) return s;
        const n = { ...s };
        delete n[k];
        return n;
      });
    },
    []
  );
  const errorOf = useCallback((k) => joined(server[k]) || checkValue(values[k], rules[k]) || undefined, [server, values, rules]);
  const invalid = useMemo(() => Object.keys(rules).filter((k) => checkValue(values[k], rules[k])), [values, rules]);
  return { values, set, setValues, errorOf, setServerErrors: setServer, invalid };
}
