import { api } from './client';

const data = (p) => p.then((r) => r.data.data);

/** Review, revised terms and delegation (backend tag Review). */
export const reviewApi = {
  queue: (tab) => data(api.get('/queue', { params: { tab } })),
  get: (id) => data(api.get(`/review/${id}`)),
  decide: (id, body) => data(api.post(`/review/${id}/decision`, body)),
  crbReport: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return data(api.post(`/review/${id}/crb-report`, form, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
  revised: (id) => data(api.get(`/applications/${id}/revised`)),
  acceptRevised: (id, body) => data(api.post(`/applications/${id}/accept-revised`, body)),
  declineRevised: (id, reason) => data(api.post(`/applications/${id}/decline-revised`, { reason })),
};

export const delegationApi = {
  list: () => data(api.get('/delegations')),
  candidates: (q) => data(api.get('/delegations/candidates', { params: { q } })),
  create: (body) => data(api.post('/delegations', body)),
  end: (id) => data(api.post(`/delegations/${id}/end`)),
};
