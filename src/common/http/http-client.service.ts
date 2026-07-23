import { Injectable } from '@nestjs/common';

export type QueryValue = string | number | boolean | undefined | null;

export type HttpRequestOptions = {
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
};

export type HttpResponse<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
  raw: string;
};

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * Cliente HTTP generico para llamadas a APIs de terceros (OneSignal, etc.).
 * Envuelve fetch nativo. Devuelve status + data parseada (no lanza en 4xx/5xx;
 * si lanza es por error de red y lo maneja el caller).
 */
@Injectable()
export class HttpClientService {
  get<T = unknown>(url: string, options?: HttpRequestOptions) {
    return this.request<T>('GET', url, options);
  }

  post<T = unknown>(url: string, options?: HttpRequestOptions) {
    return this.request<T>('POST', url, options);
  }

  patch<T = unknown>(url: string, options?: HttpRequestOptions) {
    return this.request<T>('PATCH', url, options);
  }

  put<T = unknown>(url: string, options?: HttpRequestOptions) {
    return this.request<T>('PUT', url, options);
  }

  delete<T = unknown>(url: string, options?: HttpRequestOptions) {
    return this.request<T>('DELETE', url, options);
  }

  async request<T = unknown>(
    method: HttpMethod,
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    const fullUrl = this.buildUrl(url, options.query);
    const hasBody = options.body !== undefined && method !== 'GET';

    const response = await fetch(fullUrl, {
      method,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
      ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
    });

    const raw = await response.text().catch(() => '');
    let data: T | null = null;
    if (raw) {
      try {
        data = JSON.parse(raw) as T;
      } catch {
        data = null;
      }
    }

    return { ok: response.ok, status: response.status, data, raw };
  }

  private buildUrl(url: string, query?: Record<string, QueryValue>): string {
    if (!query) {
      return url;
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }

    const qs = params.toString();
    if (!qs) {
      return url;
    }

    return `${url}${url.includes('?') ? '&' : '?'}${qs}`;
  }
}
