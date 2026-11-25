import { api } from './client';
import { downloadFile } from './staff';
import { todayEat } from '../lib/dates';

const data = (p) => p.then((r) => r.data.data);
const clean = (f) => Object.fromEntries(Object.entries(f || {}).filter(([, v]) => v !== '' && v != null));

/** Reports RP-01 to RP-07 and RP-10 (backend tag Reports). */
export const reportsApi = {
  catalogue: () => data(api.get('/reports')),
  overview: () => data(api.get('/reports/overview')),
  get: (key, filters) => data(api.get(`/reports/${key}`, { params: clean(filters) })),
  exportFile: (key, format, filters) => {
    const qs = new URLSearchParams(clean(filters)).toString();
    return downloadFile(`/reports/${key}/export/${format}${qs ? `?${qs}` : ''}`, `${key}-${todayEat()}.${format}`);
  },
};

/** Workflow settings, holidays and agreement templates (backend tag Admin). */
export const settingsApi = {
  get: () => data(api.get('/admin/settings')),
  update: (body) => data(api.put('/admin/settings', body)),
  addHoliday: (body) => data(api.post('/admin/holidays', body)),
  removeHoliday: (id) => api.delete(`/admin/holidays/${id}`),
  // D-110: the logo printed on agreements and repayment schedules.
  logo: () => data(api.get('/admin/settings/agreement-logo')),
  logoImage: () => api.get('/admin/settings/agreement-logo/image', { responseType: 'blob' }).then((r) => r.data),
  replaceLogo: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.put('/admin/settings/agreement-logo', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  resetLogo: () => api.delete('/admin/settings/agreement-logo').then((r) => r.data),
};

export const templatesApi = {
  list: () => data(api.get('/admin/templates')),
  get: (id) => data(api.get(`/admin/templates/${id}`)),
  preview: (body, language = 'sw') => data(api.post('/admin/templates/preview', { body, language })),
  upload: (body) => api.post('/admin/templates', body).then((r) => r.data),
  edit: (id, body) => api.put(`/admin/templates/${id}`, body).then((r) => r.data),
  approve: (id) => api.post(`/admin/templates/${id}/approve`).then((r) => r.data),
  reject: (id, reason) => api.post(`/admin/templates/${id}/reject`, { reason }).then((r) => r.data),
};

export const auditApi = {
  list: (params) => data(api.get('/audit', { params: clean(params) })),
  people: (q) => data(api.get('/audit/people', { params: clean({ q }) })),
};
