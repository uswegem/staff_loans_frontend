import { describe, expect, it } from 'vitest';
import { formatPhone, isNida, isPhone, nidaInput, phoneDigits, phoneValue } from './formats';
import { renderHook, act } from '@testing-library/react';
import { RULES, checkValue, failureShown, useLiveErrors, useValidatedForm } from './validation';

describe('NIDA number (D-93)', () => {
  it('puts the hyphens in while typing or pasting digits', () => {
    expect(nidaInput('19800630')).toBe('19800630');
    expect(nidaInput('198006301')).toBe('19800630-1');
    expect(nidaInput('19800630131400000420')).toBe('19800630-13140-00004-20');
    expect(nidaInput('19800630-13140-0000420')).toBe('19800630-13140-00004-20');
    expect(nidaInput('1980 0630 1314 0000 0420 99')).toBe('19800630-13140-00004-20');
    expect(nidaInput('abc19800630')).toBe('19800630');
  });

  it('is valid only in the full format with a real date', () => {
    expect(isNida('19800630-13140-00004-20')).toBe(true);
    expect(isNida('19800630131400000420')).toBe(false);
    expect(isNida('19801330-13140-00004-20')).toBe(false);
    expect(RULES.nida('19800630-13140')).toMatch(/20-digit NIDA number/);
  });
});

describe('Tanzanian phone numbers (D-93)', () => {
  it.each([
    ['0712345678', '712345678'],
    ['255712345678', '712345678'],
    ['+255712345678', '712345678'],
    ['+255 712 345 678', '712345678'],
    ['712345678', '712345678'],
  ])('%s gives the nine digits after +255', (raw, digits) => {
    expect(phoneDigits(raw)).toBe(digits);
    expect(isPhone(phoneValue(phoneDigits(raw)))).toBe(true);
  });

  it('never cuts a wrong number down: 7123456780 stays invalid', () => {
    expect(phoneDigits('7123456780')).toBe('7123456780');
    expect(isPhone(phoneValue('7123456780'))).toBe(false);
    expect(isPhone('7123456780')).toBe(false);
    expect(RULES.phone('+2557123456780')).toMatch(/nine digits after \+255/);
  });

  it('shows a stored number in groups', () => {
    expect(formatPhone('+255712345678')).toBe('+255 712 345 678');
  });
});

describe('shared validation', () => {
  it('reports a required message only for an empty value, and the format message otherwise', () => {
    const rule = { required: true, requiredMessage: 'Required to apply.', validate: RULES.phone };
    expect(checkValue('', rule)).toBe('Required to apply.');
    expect(checkValue('+2557', rule)).toMatch(/nine digits/);
    expect(checkValue('+255712345678', rule)).toBeNull();
    expect(checkValue('', { validate: RULES.phone })).toBeNull();
  });
});

describe('progressive and reactive validation (shared)', () => {
  const rules = { mobile: { required: true, requiredMessage: 'Required to apply.', validate: RULES.phone } };

  it('says nothing about an empty field on open, then follows the value once it has been left', () => {
    const { result } = renderHook(() => useValidatedForm({ mobile: '' }, rules));
    expect(result.current.errorOf('mobile')).toBeUndefined();
    act(() => result.current.touch('mobile')());
    expect(result.current.errorOf('mobile')).toBe('Required to apply.');
    act(() => result.current.set('mobile')('+2557'));
    expect(result.current.errorOf('mobile')).toMatch(/nine digits/);
    act(() => result.current.set('mobile')('+255712345678'));
    expect(result.current.errorOf('mobile')).toBeUndefined();
  });

  it('shows a saved value that is already wrong at once, and every rule after a submit', () => {
    const { result } = renderHook(() => useValidatedForm({ mobile: '7123456780', other: '' }, { ...rules, other: { required: true } }));
    expect(result.current.errorOf('mobile')).toMatch(/nine digits/);
    expect(result.current.errorOf('other')).toBeUndefined();
    act(() => result.current.attempt());
    expect(result.current.errorOf('other')).toBe('This field is required.');
  });

  it('keeps a server error until its own field changes, and the summary while any remains', () => {
    const errors = { branch: ['Required to apply.'], accountNo: ['Required to apply.'] };
    const failure = { code: 'VALIDATION_FAILED', message: 'Check the highlighted fields.' };
    const { result, rerender } = renderHook(({ values }) => useLiveErrors(errors, values), { initialProps: { values: { branch: '', accountNo: '' } } });
    expect(Object.keys(result.current)).toEqual(['branch', 'accountNo']);
    rerender({ values: { branch: 'Dodoma', accountNo: '' } });
    expect(Object.keys(result.current)).toEqual(['accountNo']);
    expect(failureShown(failure, errors, result.current)).toBe(true);
    rerender({ values: { branch: 'Dodoma', accountNo: '401022831170' } });
    expect(result.current).toEqual({});
    expect(failureShown(failure, errors, result.current)).toBe(false);
  });

  it('never drops a connection or permission failure because a field changed', () => {
    expect(failureShown({ code: 'NETWORK', message: 'Staff Loans cannot be reached.' }, {}, {})).toBe(true);
    expect(failureShown({ code: 'FORBIDDEN', message: 'Not allowed.' }, { x: ['y'] }, {})).toBe(true);
  });
});
