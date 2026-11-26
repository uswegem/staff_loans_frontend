import { describe, expect, it } from 'vitest';
import { statusLabel } from './statuses';
import { translate } from '../i18n';

// D-113: the credit stage is "Credit Underwriting" (Credit Analyst, Credit Manager, Head of Credit).
describe('Credit Underwriting', () => {
  it('names the status and the stage, in English and Swahili', () => {
    expect(statusLabel('pending_credit')).toBe('Pending Credit Underwriting');
    expect(translate('Pending Credit Underwriting', undefined, 'sw')).toBe('Inasubiri Tathmini ya Mikopo');
    expect(translate('Credit Underwriting', undefined, 'sw')).toBe('Tathmini ya Mikopo');
    expect(translate('Credit Manager', undefined, 'sw')).toBe('Meneja wa Mikopo');
    expect(translate('Credit Underwriting sees', undefined, 'sw')).toBe('Tathmini ya Mikopo inaona');
  });
});
