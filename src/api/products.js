import { api } from './client';

const data = (p) => p.then((r) => r.data.data);

/** Product and pricing maker-checker (backend openapi.json, tag Products). */
export const productsApi = {
  live: () => data(api.get('/products')),
  livePricing: () => data(api.get('/pricing')),
  adminList: () => data(api.get('/admin/products')),
  adminGet: (id) => data(api.get(`/admin/products/${id}`)),
  create: (body) => data(api.post('/admin/products', body)),
  createDraft: (id, body) => data(api.post(`/admin/products/${id}/drafts`, body)),
  pricing: () => data(api.get('/admin/pricing')),
  pricingDraft: (body) => data(api.post('/admin/pricing/drafts', body)),
};

/** Version actions; kind is 'product' or 'pricing'. */
export function versionsApi(kind) {
  const base = kind === 'pricing' ? '/admin/pricing-versions' : '/admin/product-versions';
  return {
    get: (vid) => data(api.get(`${base}/${vid}`)),
    update: (vid, body) => data(api.patch(`${base}/${vid}`, body)),
    submit: (vid) => data(api.post(`${base}/${vid}/submit`)),
    recall: (vid) => data(api.post(`${base}/${vid}/recall`)),
    discard: (vid) => data(api.post(`${base}/${vid}/discard`)),
    approve: (vid) => data(api.post(`${base}/${vid}/approve`)),
    reject: (vid, reason) => data(api.post(`${base}/${vid}/reject`, { reason })),
  };
}

export const notificationsApi = {
  list: (params) => data(api.get('/notifications', { params })),
  unreadCount: () => data(api.get('/notifications/unread-count')),
  markRead: (id) => data(api.post(`/notifications/${id}/read`)),
  markAllRead: () => api.post('/notifications/read-all'),
};
