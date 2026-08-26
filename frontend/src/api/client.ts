import { ApiError } from './ApiError';
import { mockRequest, mockUpload } from './mock';

export { ApiError };

// Build de demo (GitHub Pages): sin backend, todo corre contra un mock en memoria.
const DEMO = import.meta.env.VITE_DEMO === 'true';

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  if (DEMO) return mockRequest<T>(method, url, body);
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.mensaje ?? 'Error de red', data?.error, data?.detalles);
  }
  return data as T;
}

async function upload<T>(url: string, file: File): Promise<T> {
  if (DEMO) return mockUpload<T>(url, file);
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(url, { method: 'POST', credentials: 'include', body: fd });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data?.mensaje ?? 'Error al subir', data?.error);
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body),
  upload,
};
