// REFACTOR: Centralized HTTP client with timeout, retry, and error handling
import { setTimeout } from 'timers/promises';

export interface HttpClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  headers?: Record<string, string>;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class HttpClient {
  private config: Required<HttpClientConfig>;

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      timeout: config.timeout || 30000,
      retries: config.retries || 2,
      headers: config.headers || {}
    };
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<HttpResponse<T>> {
    const fullUrl = this.config.baseURL + url;
    const controller = new AbortController();
    const timeoutHandle = global.setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new HttpError(
          `HTTP ${response.status}: ${errorText}`,
          response.status,
          errorText
        );
      }

      const contentType = response.headers.get('content-type') || '';
      let data: T;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('text/')) {
        data = await response.text() as unknown as T;
      } else {
        data = await response.arrayBuffer() as unknown as T;
      }

      return {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error: any) {
      clearTimeout(timeoutHandle);

      if (error instanceof HttpError) {
        throw error;
      }

      if (error?.name === 'AbortError') {
        throw new HttpError(`Request timeout after ${this.config.timeout}ms`, 408);
      }

      throw new HttpError(`Network error: ${error?.message || 'Unknown error'}`, 0);
    }
  }

  private async retryRequest<T>(
    url: string,
    options: RequestInit = {},
    attempt = 1
  ): Promise<HttpResponse<T>> {
    try {
      return await this.makeRequest<T>(url, options);
    } catch (error) {
      if (attempt < this.config.retries && error instanceof HttpError) {
        // Retry on 5xx errors or network errors
        if (error.status >= 500 || error.status === 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await setTimeout(delay);
          return this.retryRequest<T>(url, options, attempt + 1);
        }
      }
      throw error;
    }
  }

  async get<T>(url: string, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    return this.retryRequest<T>(url, {
      method: 'GET',
      headers
    });
  }

  async post<T>(
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<HttpResponse<T>> {
    return this.retryRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers
    });
  }

  async put<T>(
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<HttpResponse<T>> {
    return this.retryRequest<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers
    });
  }

  async delete<T>(url: string, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    return this.retryRequest<T>(url, {
      method: 'DELETE',
      headers
    });
  }
}

// Default instance for general use
export const httpClient = new HttpClient();

// Utility function for quick requests
export async function httpGet<T>(url: string, headers?: Record<string, string>) {
  return httpClient.get<T>(url, headers);
}

export async function httpPost<T>(url: string, data?: any, headers?: Record<string, string>) {
  return httpClient.post<T>(url, data, headers);
}