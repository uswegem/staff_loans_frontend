import { describe, expect, it } from 'vitest';
import { facilitySpecs, ratePill, termRange } from './facilitySpecs';

const PRICING = { interestBps: 600, processingFeeBps: 100, processingFeeTopUpBps: 50, insuranceBps: 60 };
const product = { name: 'Staff Car Loan', minAmount: 500000, maxAmount: 200000000, minTenor: 6, maxTenor: 60, topUpAllowed: false };
const table = (rows) => rows.map((r) => [r.label, r.value]);

describe('facility card specifications', () => {
  it('lists the five rows in order, from the product and the pricing', () => {
    expect(table(facilitySpecs(product, PRICING))).toEqual([
      ['Maximum Amount', 'TZS 200,000,000'],
      ['Minimum Amount', 'TZS 500,000'],
      ['Term (Months)', '6–60'],
      ['Processing Fee', '1%'],
      ['Insurance', '0.6% p.a.'],
    ]);
    expect(facilitySpecs(product, PRICING)[0].strong).toBe(true);
  });

  it('formats other values without inventing any', () => {
    const rows = facilitySpecs({ ...product, maxAmount: 300000000, minTenor: 12, maxTenor: 120 }, { ...PRICING, interestBps: 650, insuranceBps: 75 });
    expect(table(rows)[0]).toEqual(['Maximum Amount', 'TZS 300,000,000']);
    expect(table(rows)[2]).toEqual(['Term (Months)', '12–120']);
    expect(table(rows)[4]).toEqual(['Insurance', '0.75% p.a.']);
  });

  it('shows one value for a fixed tenor', () => {
    expect(termRange(12, 12)).toBe('12');
    expect(termRange(6, 60)).toBe('6–60');
    expect(termRange(undefined, 24)).toBe('24');
    expect(termRange(null, undefined)).toBeNull();
  });

  it('names the top-up processing fee when the product allows top-ups and it differs', () => {
    expect(table(facilitySpecs({ ...product, topUpAllowed: true }, PRICING))[3]).toEqual(['Processing Fee', '1% (top-up 0.5%)']);
    expect(table(facilitySpecs({ ...product, topUpAllowed: true }, { ...PRICING, processingFeeTopUpBps: 100 }))[3]).toEqual(['Processing Fee', '1%']);
  });

  it('keeps configured zeros and leaves out what is not configured', () => {
    expect(table(facilitySpecs(product, { interestBps: 600, processingFeeBps: 0, insuranceBps: 0 })).slice(3)).toEqual([['Processing Fee', '0%'], ['Insurance', '0% p.a.']]);
    expect(facilitySpecs(product, {}).map((r) => r.key)).toEqual(['max', 'min', 'term']);
    expect(facilitySpecs(product, null).map((r) => r.key)).toEqual(['max', 'min', 'term']);
    expect(facilitySpecs({ name: 'Odd', maxAmount: 'abc', minAmount: NaN }, { insuranceBps: '60' })).toEqual([]);
    const text = JSON.stringify(facilitySpecs({ ...product, minAmount: undefined }, { processingFeeBps: null }));
    expect(text).not.toMatch(/undefined|NaN|null/);
  });

  it('gives the rate pill only when an interest rate is configured', () => {
    expect(ratePill(PRICING)).toEqual({ rate: '6% p.a.', method: 'Reducing Balance' });
    expect(ratePill({ interestBps: 0 })).toEqual({ rate: '0% p.a.', method: 'Reducing Balance' });
    expect(ratePill({})).toBeNull();
    expect(ratePill(null)).toBeNull();
  });
});
