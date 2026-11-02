import { api } from './client';

const data = (p) => p.then((r) => r.data.data);
const seg = encodeURIComponent;

/** Lookup lists for forms (D-93): countries and Region → District → Ward. */
export const referenceApi = {
  countries: () => data(api.get('/reference-data/countries')),
  regions: () => data(api.get('/reference-data/regions')),
  districts: (region) => data(api.get(`/reference-data/regions/${seg(region)}/districts`)),
  wards: (region, district) => data(api.get(`/reference-data/regions/${seg(region)}/districts/${seg(district)}/wards`)),
};
