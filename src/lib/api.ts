const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'saferoute_token';

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!API_BASE_URL) throw new Error('Set VITE_API_URL in the frontend environment to your backend API URL.');
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('saferoute:unauthorized'));
    }
    throw new Error(data?.message || `Request failed (${response.status}).`);
  }
  return data as T;
}

export { TOKEN_KEY };
