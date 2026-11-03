// One validation behaviour for every form (D-93):
// - a red border only when a required field is empty or a value fails its format;
// - the normal border as soon as the value meets the rule, while the person types;
// - a message that says what is wrong ("Enter nine digits after +255…"), and the
//   required message only for an empty field;
// - an error returned by the server shows until that field is changed;
// - nothing is red when a form opens empty: a field's message waits until it is left or the
//   form is submitted, then follows every change.

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
 * Whether the message of a failed save still applies. "Check the highlighted fields" (the
 * API's field validation, VALIDATION_FAILED with field details) shows while one of those
 * fields still shows its error and goes once they are all corrected; any other failure
 * (connection, permission, a business rule) stays until the next save or until dismissed.
 * failure: apiError(...) of the last save; errors: its details; server: useServerErrors(...).
 */
export function failureShown(failure, errors, server) {
  if (!failure) return false;
  const fields = Object.keys(errors || {});
  if (failure.code !== 'VALIDATION_FAILED' || !fields.length) return true;
  const still = typeof server === 'function' ? server : (k) => server?.[k];
  return fields.some((k) => still(k));
}

/**
 * The server's field errors in their own shape ({ field: [messages] }), keeping only the
 * fields not changed since they were returned: for forms that read errors[k] directly.
 */
export function useLiveErrors(errors, values) {
  const server = useServerErrors(errors, values);
  return useMemo(() => Object.fromEntries(Object.entries(errors || {}).filter(([k]) => server(k))), [errors, server]);
}

/**
 * Form state with rules checked on every change, shown progressively:
 * - a field's rule message shows once the field has been left (touch) or the form submitted
 *   (attempt); a saved value that already breaks its format rule shows at once;
 * - from then on it is re-checked on every change: it goes as soon as the value is right
 *   and follows the value while it is still wrong;
 * - a server error shows until that field is changed.
 * rules: { field: rule } (see checkValue). Returns
 * { values, set(k) → onChange handler, touch(k) → onBlur handler, attempt(), shown(k),
 *   setValues, errorOf(k), setServerErrors, invalid }.
 */
export function useValidatedForm(initial, rules = {}) {
  const [values, setValues] = useState(initial);
  const [server, setServer] = useState({});
  const start = useRef(initial);
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);
  const touch = useCallback((k) => () => setTouched((x) => (x[k] ? x : { ...x, [k]: true })), []);
  const attempt = useCallback(() => setAttempted(true), []);
  const shown = useCallback(
    (k) => attempted || !!touched[k] || (!empty(values[k]) && typeof values[k] !== 'object' && values[k] === start.current[k]),
    [attempted, touched, values]
  );
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
  const errorOf = useCallback((k) => joined(server[k]) || (shown(k) ? checkValue(values[k], rules[k]) : null) || undefined, [server, values, rules, shown]);
  const invalid = useMemo(() => Object.keys(rules).filter((k) => checkValue(values[k], rules[k])), [values, rules]);
  return { values, set, touch, attempt, shown, setValues, errorOf, setServerErrors: setServer, serverLeft: Object.keys(server).length, invalid };
}
