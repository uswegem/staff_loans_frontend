import { api } from './client';

const data = (p) => p.then((r) => r.data.data);

/** Applicant endpoints (backend tag Applications). */
export const applicationsApi = {
  list: () => data(api.get('/applications')),
  create: (productId) => data(api.post('/applications', { productId })),
  get: (id) => data(api.get(`/applications/${id}`)),
  update: (id, body) => data(api.patch(`/applications/${id}`, body)),
  preview: (id) => data(api.get(`/applications/${id}/agreement/preview`)),
  signAndSubmit: (id, body) => data(api.post(`/applications/${id}/sign-and-submit`, body)),
  withdraw: (id, reason) => data(api.post(`/applications/${id}/withdraw`, { reason })),
  addDocument: (id, file, label, documentCode) => {
    const form = new FormData();
    form.append('file', file);
    if (label) form.append('label', label);
    if (documentCode) form.append('documentCode', documentCode);
    return data(api.post(`/applications/${id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
  /** The latest payslip PDF; the API reads Basic Pay, LFB deductions and the pay date (D-79). */
  setPayslip: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return data(api.post(`/applications/${id}/payslip`, form, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
  removeDocument: (id, fileId) => api.delete(`/applications/${id}/documents/${fileId}`),
  agreement: (id) => data(api.get(`/agreements/${id}`)),
};
