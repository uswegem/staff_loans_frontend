import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import LoanIcon, { loanIconKey } from './LoanIcons';

describe('loan facility icons', () => {
  it.each([
    [{ name: 'Staff Car Loan' }, 'car'],
    [{ name: 'Vehicle Loan' }, 'car'],
    [{ code: 'CARLOAN', name: 'STAFF CAR LOAN' }, 'car'],
    [{ name: 'Staff Personal Loan' }, 'wallet'],
    [{ code: 'STAFF', name: 'STAFF LOAN' }, 'generic'],
    [{ name: 'Housing / Education Loan' }, 'house'],
    [{ name: 'Mortgage' }, 'house'],
    [{ name: 'Education Loan' }, 'graduation'],
    [{ name: 'Medical Loan' }, 'heartPulse'],
    [{ name: 'Device Loan' }, 'smartphone'],
    [{ name: 'Computer Loan' }, 'laptop'],
    [{ name: 'Salary Advance' }, 'banknote'],
    [{ name: 'Holiday Facility' }, 'generic'],
    [{ name: 'Scarlet Fund' }, 'generic'], // "car" inside another word in a name is not a car
  ])('%o → %s', (product, key) => {
    expect(loanIconKey(product)).toBe(key);
  });

  it('uses a configured icon first, and copes with a missing name or category', () => {
    expect(loanIconKey({ icon: 'laptop', name: 'Car Loan' })).toBe('laptop');
    expect(loanIconKey({ icon: 'not-an-icon', name: 'Car Loan' })).toBe('car');
    expect(loanIconKey({})).toBe('generic');
    expect(loanIconKey(undefined)).toBe('generic');
    expect(loanIconKey({ code: null, name: null })).toBe('generic');
  });

  it('is decorative and drawn at the requested size', () => {
    const { container } = render(<LoanIcon product={{ name: 'Car Loan' }} size={44} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '44');
    expect(svg).toHaveAttribute('data-icon', 'car');
  });
});
