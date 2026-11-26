import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DisbursementsPage from './DisbursementsPage';
import NotificationsPage from '../notifications/NotificationsPage';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

const row = {
  id: 'a1',
  ref: 'SL-2026-00019',
  staff: { name: 'Faraji Nyoni', staffNo: 'LFB0188', station: 'Arusha Branch' },
  product: 'Salary Advance',
  amount: 800000,
  tenor: 3,
  instalment: 270000,
  processingFee: 8000,
  insuranceFee: 4800,
  fees: 12800,
  repayment: { method: 'payroll' },
  approvedAt: '2026-10-22T09:00:00Z',
  daysWaiting: 31,
  outsideSla: true,
  blockedReason: null,
  canConfirm: true,
  canBook: false,
  canDownload: true,
  ownLoan: false,
  agreementId: 'g1',
  agreementNumber: 'MKT-2026-00012',
  booking: { loanAccountNumber: 'LN2026000123', date: '2026-10-23', note: null, by: 'Upendo Massawe' },
};

const detail = {
  ...row,
  agreement: { id: 'g1', number: 'MKT-2026-00012', signedAt: '2026-10-18T09:00:00Z', effectiveAt: '2026-10-22T09:00:00Z' },
  creditTo: { bank: 'Letshego Faidika Bank', accountNo: '0150123456' },
  topUp: null,
  earliestDate: '2026-10-22',
  today: '2026-10-30',
};

// Downloads go through a blob link; jsdom has no object URLs.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

const list = (items, counts = { booking: 0, ready: items.length, done: 0, outsideSla: 1 }, tab = 'ready') => () => [200, { data: { tab, counts, slaDays: 30, items } }];

describe('disbursements', () => {
  it('flags loans outside SLA and checks the confirmation before sending it', async () => {
    const calls = stubHttp({
      'GET /disbursements': list([row]),
      'GET /disbursements/a1': () => [200, { data: detail }],
      'POST /disbursements/a1/confirm': () => [200, { message: 'SL-2026-00019 disbursed. Journey complete.', data: {} }],
    });
    renderAt('/disburse', '/disburse', <DisbursementsPage />, { permissions: ['disb.confirm'] });
    expect(await screen.findByText('1 loan has waited more than 30 days')).toBeInTheDocument();
    const r = screen.getByText('SL-2026-00019').closest('tr');
    expect(within(r).getByText('Outside SLA')).toBeInTheDocument();
    expect(within(r).getByText('12,800')).toBeInTheDocument();

    await userEvent.click(within(r).getByRole('button', { name: 'Mark as disbursed' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Mark as disbursed', { selector: 'h2' })).toBeInTheDocument();
    expect(await within(dialog).findByText('Letshego Faidika Bank, 0150123456')).toBeInTheDocument();
    expect(within(dialog).getByText('Salary deduction (HR and Finance)')).toBeInTheDocument();
    // The booking, read-only, above the form; the papers next to each other.
    expect(within(dialog).getByText('LN2026000123')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Download the agreement for SL-2026-00019' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Download the loan summary for SL-2026-00019' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    // No comment is filled in for OPS.
    expect(within(dialog).getByRole('textbox', { name: /Comment/i })).toHaveValue('');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Transaction reference/i }), 'FT26294AB12');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Comment/i }), 'Paid to the staff account.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as disbursed' }));
    expect(await screen.findByText('SL-2026-00019 disbursed. Journey complete.')).toBeInTheDocument();
    expect(screen.getByText('Marked as disbursed')).toBeInTheDocument();
    const body = JSON.parse(calls.find((c) => c.key === 'POST /disbursements/a1/confirm').config.data);
    expect(body).toEqual({ date: '2026-10-30', transactionRef: 'FT26294AB12', comment: 'Paid to the staff account.' });
  });

  it('needs the core banking reference and a comment of at least 5 characters (SLAS-006, D-112)', async () => {
    const calls = stubHttp({
      'GET /disbursements': list([row]),
      'GET /disbursements/a1': () => [200, { data: detail }],
    });
    renderAt('/disburse', '/disburse', <DisbursementsPage />, { permissions: ['disb.confirm'] });
    const r = (await screen.findByText('SL-2026-00019')).closest('tr');
    await userEvent.click(within(r).getByRole('button', { name: 'Mark as disbursed' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Letshego Faidika Bank, 0150123456');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as disbursed' }));
    expect(await within(dialog).findByText('Enter the core banking transaction reference.')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Transaction reference/i }), 'FT26294AB12');
    expect(within(dialog).getByText('Add a comment for the disbursement record.')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Comment/i }), 'Paid');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as disbursed' }));
    expect(within(dialog).getByText('Add a comment for the disbursement record.')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /disbursements/a1/confirm')).toBe(false);
  });

  it('the Agreement and Loan summary on every tab; downloads use the agreement number and reference (D-112)', async () => {
    const done = { ...row, canConfirm: false, disbursement: { date: '2026-10-30', transactionRef: 'FT26294AB12', comment: 'Paid to the staff account.', by: 'Halima Said' } };
    const calls = stubHttp({
      'GET /disbursements': (config) => {
        const tab = config.params?.tab || 'ready';
        const items = tab === 'done' ? [done] : tab === 'booking' ? [{ ...row, booking: null, canConfirm: false }] : [row];
        return [200, { data: { tab, counts: { booking: 1, ready: 1, done: 1, outsideSla: 0 }, slaDays: 30, items } }];
      },
      'GET /agreements/g1/pdf': () => [200, new Blob(['%PDF'])],
      'GET /disbursements/a1/summary.pdf': () => [200, new Blob(['%PDF'])],
    });
    renderAt('/disburse', '/disburse', <DisbursementsPage />, { permissions: ['disb.confirm'] });
    for (const tab of [null, 'To book', 'Disbursed']) {
      if (tab) await userEvent.click(screen.getByRole('tab', { name: new RegExp(tab) }));
      // eslint-disable-next-line no-await-in-loop
      const r = (await screen.findByText('SL-2026-00019')).closest('tr');
      expect(within(r).getByRole('button', { name: 'Download the agreement for SL-2026-00019' })).toHaveTextContent('Agreement');
      expect(within(r).getByRole('button', { name: 'Download the loan summary for SL-2026-00019' })).toHaveTextContent('Loan summary');
    }
    // The Disbursed tab shows the reference, the comment and who confirmed it.
    const r = screen.getByText('SL-2026-00019').closest('tr');
    expect(within(r).getByText('FT26294AB12')).toBeInTheDocument();
    expect(within(r).getByText('Paid to the staff account.')).toBeInTheDocument();
    expect(within(r).getByText('by Halima Said')).toBeInTheDocument();
    expect(within(r).queryByRole('button', { name: 'Mark as disbursed' })).toBeNull();
    await userEvent.click(within(r).getByRole('button', { name: 'Download the agreement for SL-2026-00019' }));
    await userEvent.click(within(r).getByRole('button', { name: 'Download the loan summary for SL-2026-00019' }));
    expect(calls.some((c) => c.key === 'GET /agreements/g1/pdf')).toBe(true);
    expect(calls.some((c) => c.key === 'GET /disbursements/a1/summary.pdf')).toBe(true);
  });

  it('the disbursed record shows date, reference, comment and who confirmed it, read-only (D-112)', async () => {
    const done = { ...row, canConfirm: false, status: 'disbursed', disbursement: { date: '2026-10-30', transactionRef: 'FT26294AB12', comment: 'Paid to the staff account.', by: 'Halima Said' } };
    stubHttp({
      'GET /disbursements': list([done], { booking: 0, ready: 0, done: 1, outsideSla: 0 }, 'done'),
      'GET /disbursements/a1': () => [200, { data: { ...detail, ...done, documents: [], documentChecklist: [] } }],
    });
    renderAt('/disburse', '/disburse', <DisbursementsPage />, { permissions: ['disb.confirm'] });
    const r = (await screen.findByText('SL-2026-00019')).closest('tr');
    await userEvent.click(within(r).getByRole('button', { name: 'View' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Paid to the staff account.')).toBeInTheDocument();
    expect(within(dialog).getByText('FT26294AB12')).toBeInTheDocument();
    expect(within(dialog).getByText('Halima Said')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Download the loan summary for SL-2026-00019' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox')).toBeNull();
  });

  it("no papers on the person's own loan (D-112)", async () => {
    stubHttp({ 'GET /disbursements': list([{ ...row, canConfirm: false, canDownload: false, ownLoan: true, blockedReason: 'This is your own loan. Another OPS officer confirms it.' }], { booking: 0, ready: 1, done: 0, outsideSla: 0 }) });
    renderAt('/disburse', '/disburse', <DisbursementsPage />, { permissions: ['disb.confirm'] });
    const r = (await screen.findByText('SL-2026-00019')).closest('tr');
    expect(within(r).queryByRole('button', { name: /Download the/ })).toBeNull();
    expect(within(r).getByText('This is your own loan. Another OPS officer confirms it.')).toBeInTheDocument();
  });

  it('shows why OPS cannot confirm their own or an approved loan', async () => {
    stubHttp({ 'GET /disbursements': list([{ ...row, outsideSla: false, canConfirm: false, blockedReason: 'You approved this loan, so another OPS officer confirms it.' }], { ready: 1, done: 0, outsideSla: 0 }) });
    renderAt('/disburse', '/disburse', <DisbursementsPage />, { permissions: ['disb.confirm'] });
    expect(await screen.findByText('You approved this loan, so another OPS officer confirms it.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as disbursed' })).toBeNull();
  });
});

describe('notifications inbox', () => {
  it('lists notifications, opens one and marks it read', async () => {
    const calls = stubHttp({
      'GET /notifications': () => [200, { data: { unread: 1, items: [{ id: 'n1', text: 'SL-2026-00015: your loan of TZS 500,000 has been disbursed.', href: '/applications/a9', read: false, createdAt: '2026-10-30T08:00:00Z' }, { id: 'n2', text: 'Older note', href: null, read: true, createdAt: '2026-10-29T08:00:00Z' }] } }],
      'POST /notifications/n1/read': () => [200, { data: {} }],
    });
    renderAt('/notifications', '/notifications', <NotificationsPage />);
    const note = await screen.findByRole('button', { name: /has been disbursed.*unread/ });
    await userEvent.click(note);
    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /notifications/n1/read')).toBe(true);
  });

  it('People and Culture book a loan: account number and date, then it goes to OPS (D-107)', async () => {
    const toBook = { ...row, booking: null, canBook: true, canConfirm: false, bookBlockedReason: null };
    const calls = stubHttp({
      'GET /disbursements': list([toBook], { booking: 1, ready: 0, done: 0, outsideSla: 0 }, 'booking'),
      'GET /disbursements/a1': () => [200, { data: { ...detail, ...toBook } }],
      'POST /disbursements/a1/book': () => [200, { message: 'SL-2026-00019 booked. OPS can now disburse it.', data: {} }],
    });
    renderAt('/disburse', '/disburse', <DisbursementsPage />, { permissions: ['loan.book'] });
    expect(await screen.findByRole('heading', { name: 'Disbursement' })).toBeInTheDocument();
    const r = (await screen.findByText('SL-2026-00019')).closest('tr');
    expect(within(r).queryByRole('button', { name: 'Mark as disbursed' })).toBeNull();
    await userEvent.click(within(r).getByRole('button', { name: 'Book loan' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Letshego Faidika Bank, 0150123456');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Book loan' }));
    expect(within(dialog).getByText('Enter the core banking loan account number.')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Loan account number/i }), 'LN2026000123');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Note/i }), 'Staff loan product.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Book loan' }));
    expect(await screen.findByText('SL-2026-00019 booked. OPS can now disburse it.')).toBeInTheDocument();
    const body = JSON.parse(calls.find((c) => c.key === 'POST /disbursements/a1/book').config.data);
    expect(body).toEqual({ loanAccountNumber: 'LN2026000123', date: '2026-10-30', note: 'Staff loan product.' });
  });

  it('a step this person cannot act on is read-only, with the reason', async () => {
    const waiting = { ...row, booking: null, canBook: false, canConfirm: false, bookBlockedReason: null };
    stubHttp({ 'GET /disbursements': list([waiting], { booking: 1, ready: 0, done: 0, outsideSla: 0 }, 'booking') });
    renderAt('/disburse', '/disburse', <DisbursementsPage />, { permissions: ['disb.confirm'] });
    const r = (await screen.findByText('SL-2026-00019')).closest('tr');
    expect(within(r).getByText('Waiting for People and Culture to book it.')).toBeInTheDocument();
    expect(within(r).queryByRole('button', { name: 'Book loan' })).toBeNull();
    expect(within(r).getByRole('button', { name: 'View' })).toBeInTheDocument();
  });

  it('the person who booked a loan sees why they cannot confirm it', async () => {
    const mine = { ...row, canConfirm: false, blockedReason: 'You booked this loan, so an OPS officer confirms its disbursement.' };
    stubHttp({ 'GET /disbursements': list([mine]) });
    renderAt('/disburse', '/disburse', <DisbursementsPage />, { permissions: ['disb.confirm', 'loan.book'] });
    const r = (await screen.findByText('SL-2026-00019')).closest('tr');
    expect(within(r).getByText('You booked this loan, so an OPS officer confirms its disbursement.')).toBeInTheDocument();
    expect(within(r).queryByRole('button', { name: 'Mark as disbursed' })).toBeNull();
  });
});
