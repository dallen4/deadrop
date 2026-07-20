const BASE = 'https://api.turso.tech/v1/organizations';

export class TursoApiError extends Error {
  constructor(
    public readonly status: number,
    method: string,
    path: string,
    body: string,
  ) {
    super(`Turso API ${method} ${path} (${status}): ${body}`);
    this.name = 'TursoApiError';
  }
}

export type TursoClient = ReturnType<typeof createTursoClient>;

export const createTursoClient = (
  organization: string,
  apiToken: string,
) => {
  const baseUrl = `${BASE}/${organization}/databases`;

  const headers = {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };

  const request = async <T>(
    path: string,
    method: string,
    body?: unknown,
  ): Promise<T> => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new TursoApiError(res.status, method, path, text);
    }

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return res.json() as Promise<T>;
    }

    return undefined as T;
  };

  return {
    get: <T>(path: string) => request<T>(path, 'GET'),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, 'POST', body),
    patch: <T>(path: string, body: unknown) =>
      request<T>(path, 'PATCH', body),
    del: <T>(path: string) => request<T>(path, 'DELETE'),
  };
};
