/** Small fetch wrapper for the Express REST API. */

export class ApiError extends Error {
  constructor(message, status = 0, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(path, { method = 'GET', body, timeout = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`/api${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      signal: controller.signal,
    });

    const payload = response.status === 204 ? null : await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(
        payload?.error?.message || `Request failed with status ${response.status}.`,
        response.status,
        payload?.error?.details,
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.name === 'AbortError') throw new ApiError('The request timed out. Please try again.');
    throw new ApiError('Unable to reach the server. Please check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  profile: () => apiRequest('/profile'),
  skills: () => apiRequest('/skills'),
  achievements: () => apiRequest('/achievements'),
  projects: () => apiRequest('/projects'),
  sendMessage: (message) => apiRequest('/contact', { method: 'POST', body: message }),
};
