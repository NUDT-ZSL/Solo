export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

class HttpClient {
  private baseUrl = '/api';

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const authState = localStorage.getItem('auth-storage');
    if (authState) {
      try {
        const parsed = JSON.parse(authState);
        const token = parsed.state?.token;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch {
        // ignore parse errors
      }
    }
    return headers;
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };

    if (body !== undefined && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const fullUrl = `${this.baseUrl}${url}`;

    const response = await fetch(fullUrl, options);
    const data = (await response.json()) as ApiResponse<T>;

    if (!response.ok || data.code !== 0) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  get<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url);
  }

  post<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, body);
  }

  put<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, body);
  }

  delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url);
  }
}

export const httpClient = new HttpClient();
