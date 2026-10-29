// Ported from Ess-Frontend/src/services/userService.js, adapted for SLAS: users are
// created from staff records, roles are assigned with end dates, and roles and
// permissions have their own endpoints (backend openapi.json).

import { api } from './client';

const data = (p) => p.then((r) => r.data.data);

export const usersApi = {
  list: (params) => data(api.get('/users', { params })),
  get: (id) => data(api.get(`/users/${id}`)),
  create: (staffNo, temporaryPassword) => data(api.post('/users', { staffNo, temporaryPassword })),
  setRoles: (id, assignments) => data(api.put(`/users/${id}/roles`, { assignments })),
  activate: (id) => data(api.post(`/users/${id}/activate`)),
  deactivate: (id) => data(api.post(`/users/${id}/deactivate`)),
  unlock: (id) => data(api.post(`/users/${id}/unlock`)),
  resetMfa: (id) => data(api.post(`/users/${id}/reset-mfa`)),
  resetPassword: (id, temporaryPassword) => data(api.post(`/users/${id}/reset-password`, { temporaryPassword })),
};

export const rolesApi = {
  catalogue: () => data(api.get('/permissions')),
  list: () => data(api.get('/roles')),
  create: (body) => data(api.post('/roles', body)),
  update: (id, body) => data(api.patch(`/roles/${id}`, body)),
  remove: (id) => api.delete(`/roles/${id}`),
  sodCheck: (body) => data(api.post('/roles/sod-check', body)),
};
