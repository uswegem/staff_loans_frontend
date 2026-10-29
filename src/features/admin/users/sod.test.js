import { describe, expect, it } from 'vitest';
import { conflictsFor, needsMfa } from './sod';

const catalogue = {
  permissions: [
    { id: 'review.credit', kind: 'approve' },
    { id: 'disb.confirm', kind: 'disburse' },
    { id: 'admin.users', kind: 'admin' },
    { id: 'products.make', kind: 'admin' },
    { id: 'products.check', kind: 'check' },
    { id: 'reports.view' },
  ],
  sodRules: [
    { id: 'sod1', a: ['admin', 'check'], b: ['approve', 'disburse'] },
    { id: 'sod2', a: ['approve'], b: ['disburse'] },
    { id: 'sod3', all: ['products.make', 'products.check'] },
  ],
};

describe('SoD preview', () => {
  it('flags each rule', () => {
    expect(conflictsFor(['admin.users', 'review.credit'], catalogue).map((r) => r.id)).toEqual(['sod1']);
    expect(conflictsFor(['review.credit', 'disb.confirm'], catalogue).map((r) => r.id)).toEqual(['sod2']);
    expect(conflictsFor(['products.make', 'products.check'], catalogue).map((r) => r.id)).toEqual(['sod3']);
    expect(conflictsFor(['review.credit', 'reports.view'], catalogue)).toEqual([]);
  });
  it('knows who needs MFA', () => {
    expect(needsMfa(['reports.view'], catalogue)).toBe(false);
    expect(needsMfa(['products.check'], catalogue)).toBe(true);
  });
});
