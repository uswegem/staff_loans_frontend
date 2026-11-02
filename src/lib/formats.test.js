import { describe, expect, it } from 'vitest';
import { formatPhone, isNida, isPhone, nidaInput, phoneDigits, phoneValue } from './formats';
import { RULES, checkValue } from './validation';

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
