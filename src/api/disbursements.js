import { api } from './client';
import { downloadFile } from './staff';
import { todayEat } from '../lib/dates';

const data = (p) => p.then((r) => r.data.data);

/** The Disbursement queue (D-112) and the disbursed loans register (backend tag Disbursement). */
export const disbursementsApi = {
  list: (tab, q) => data(api.get('/disbursements', { params: { tab, ...(q ? { q } : {}) } })),
  get: (id) => data(api.get(`/disbursements/${id}`)),
  // D-107: People and Culture book the loan in core banking before OPS disburse it.
  book: (id, body) => api.post(`/disbursements/${id}/book`, body).then((r) => r.data),
  confirm: (id, body) => api.post(`/disbursements/${id}/confirm`, body).then((r) => r.data),
  // D-112: the papers for People and Culture and OPS (never the applicant's own loan).
  agreementPdf: (agreementId, number) => downloadFile(`/agreements/${agreementId}/pdf`, `${number}.pdf`),
  summaryPdf: (id, ref) => downloadFile(`/disbursements/${id}/summary.pdf`, `loan-summary-${ref}.pdf`),
  exportRegister: () => downloadFile('/disbursements/register.csv', `disbursed-loans-register-${todayEat()}.csv`),
};
