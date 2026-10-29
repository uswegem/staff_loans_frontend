import axios from 'axios';
import { api } from '../api/client';

/**
 * Routes axios requests to handlers: { 'POST /auth/login': (config) => [status, body] }.
 * Covers both the api instance and plain axios (used by refresh). Returns the call log.
 */
export function stubHttp(routes) {
  const calls = [];
  const adapter = async (config) => {
    const path = config.url.replace(/^\/api\/v1/, '');
    const key = `${config.method.toUpperCase()} ${path}`;
    calls.push({ key, config });
    const handler = routes[key];
    if (!handler) throw new Error(`No stub for ${key}`);
    const [status, data] = await handler(config, calls);
    const response = { status, data, headers: {}, config, statusText: String(status) };
    if (status >= 400) {
      const err = new axios.AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, {}, response);
      throw err;
    }
    return response;
  };
  api.defaults.adapter = adapter;
  axios.defaults.adapter = adapter;
  return calls;
}
