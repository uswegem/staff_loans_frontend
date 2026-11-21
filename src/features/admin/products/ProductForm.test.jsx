import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductForm, { codeFrom, keyFrom } from './ProductForm';
import { renderAt } from '../../../test/render';
import { stubHttp } from '../../../test/http';

const base = {
  name: 'Vehicle Loan', description: '', minAmount: 500000, maxAmount: 300000000, minTenor: 12, maxTenor: 84, minServiceMonths: 6, maxConcurrent: 1,
  reapplyCoolingMonths: 6, topUpAllowed: false, contractStaffAllowed: false, eligibleCategories: ['Management', 'Non-management'], repaymentMethods: ['payroll'],
  payslipLabel: 'Staff Loan - Vehicle', fields: [{ key: 'make', label: 'Make and model', type: 'text', options: [], mandatory: true }],
  requiredDocuments: [{ code: 'invoice', name: 'Invoice', description: '', mandatory: true, minFiles: 1, maxFiles: 2, allowedTypes: ['pdf'], maxFileMb: 10, displayOrder: 0, active: true }],
  agreementTemplateId: null,
};

let latest;
function Harness() {
  const [v, setV] = useState(base);
  latest = v;
  return <ProductForm values={v} onChange={setV} />;
}
const open = () => {
  stubHttp({ 'GET /admin/products/agreements': () => [200, { data: [] }] });
  renderAt('/f', '/f', <Harness />, { permissions: ['products.make'] });
};

describe('codes and keys are made from names', () => {
  it('codeFrom and keyFrom follow the API formats and avoid clashes', () => {
    expect(codeFrom('Photos of the car', new Set())).toBe('photos_of_the_car');
    expect(codeFrom('Invoice', new Set(['invoice']))).toBe('invoice_2');
    expect(codeFrom('2024 receipt', new Set())).toBe('doc_2024_receipt');
    expect(keyFrom('Make and model', new Set())).toBe('makeAndModel');
    expect(keyFrom('Make and model', new Set(['makeAndModel']))).toBe('makeAndModel2');
  });

  it('a new requirement starts mandatory with 1 file, PDF/JPG/PNG and 10 MB, and its code comes from its name', async () => {
    open();
    expect(screen.queryByLabelText('Document code')).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: 'Add document requirement' }));
    const names = screen.getAllByLabelText('Document name');
    await userEvent.type(names[1], 'Photos of the car');
    const added = latest.requiredDocuments[1];
    expect(added).toMatchObject({ code: 'photos_of_the_car', mandatory: true, minFiles: 1, maxFiles: 1, maxFileMb: 10, active: true });
    expect(added.allowedTypes).toEqual(expect.arrayContaining(['pdf', 'jpg', 'png']));
    expect(screen.getAllByRole('checkbox', { name: 'PNG' })[1]).toBeChecked();
  });

  it('renaming a saved requirement or field keeps its code and key', async () => {
    open();
    const name = (await screen.findAllByLabelText('Document name'))[0];
    await userEvent.clear(name);
    await userEvent.type(name, 'Pro forma invoice');
    expect(latest.requiredDocuments[0].code).toBe('invoice');
    const label = screen.getByLabelText('Field 1 label');
    await userEvent.type(label, ' of the car');
    expect(latest.fields[0].key).toBe('make');
    expect(screen.queryByRole('columnheader', { name: 'Key' })).toBeNull();
  });

  it('without an approved agreement, points to Agreement templates', async () => {
    open();
    expect(await screen.findByRole('link', { name: 'Go to Agreement templates' })).toHaveAttribute('href', '/admin/templates');
  });
});
