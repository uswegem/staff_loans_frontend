import { api } from './client';

const data = (p) => p.then((r) => r.data.data);

/** The signed-in staff member's own profile (backend tag Profile). */
export const profileApi = {
  get: () => data(api.get('/me/profile')),
  completeness: () => data(api.get('/me/profile/completeness')),
  eligibility: () => data(api.get('/me/eligibility')),
  saveDateJoined: (dateJoined) => data(api.patch('/me/profile/date-joined', { dateJoined })),
  savePersonal: (body) => data(api.patch('/me/profile/personal', body)),
  saveBank: (body) => data(api.patch('/me/profile/bank', body)),
  saveKin: (nextOfKin) => data(api.patch('/me/profile/kin', { nextOfKin })),
  savePay: (body) => data(api.patch('/me/profile/pay', body)),
};

/** Staff records for People and Culture (backend tag Staff). */
export const staffApi = {
  list: (params) => data(api.get('/staff', { params })),
  get: (id) => data(api.get(`/staff/${id}`)),
  create: (body) => data(api.post('/staff', body)),
  update: (id, body) => data(api.patch(`/staff/${id}`, body)),
  setStatus: (id, body) => data(api.post(`/staff/${id}/status`, body)),
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return data(api.post('/staff/import', form, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
  getImport: (id) => data(api.get(`/staff/import/${id}`)),
  commitImport: (id) => data(api.post(`/staff/import/${id}/commit`)),
  discardImport: (id) => data(api.post(`/staff/import/${id}/discard`)),
};

/** Downloads a file from the API with the access token and saves it under `name`. */
export async function downloadFile(url, name) {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/** Date of birth verification by People and Culture (D-82). */
export const dobApi = {
  queue: (status = 'pending') => data(api.get('/dob-verifications', { params: { status } })),
  approve: (id) => api.post(`/dob-verifications/${id}/approve`).then((r) => r.data),
  reject: (id, reason) => api.post(`/dob-verifications/${id}/reject`, { reason }).then((r) => r.data),
  withdraw: (id) => api.post(`/dob-verifications/${id}/withdraw`).then((r) => r.data),
  forStaff: (staffId) => data(api.get(`/staff/${staffId}/date-of-birth`)),
  propose: (staffId, dob) => data(api.post(`/staff/${staffId}/date-of-birth`, { dob })),
};
