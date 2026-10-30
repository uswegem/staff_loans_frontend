import { api } from './client';
import { downloadFile } from './staff';
import { todayEat } from '../lib/dates';

const data = (p) => p.then((r) => r.data.data);

/** OPS disbursements and the disbursed loans register (backend tag Disbursement). */
export const disbursementsApi = {
  list: (tab, q) => data(api.get('/disbursements', { params: { tab, ...(q ? { q } : {}) } })),
  get: (id) => data(api.get(`/disbursements/${id}`)),
  confirm: (id, body) => api.post(`/disbursements/${id}/confirm`, body).then((r) => r.data),
  exportRegister: () => downloadFile('/disbursements/register.csv', `disbursed-loans-register-${todayEat()}.csv`),
};
