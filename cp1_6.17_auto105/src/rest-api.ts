export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiRequest<T = unknown> {
  method: HttpMethod;
  path: string;
  params?: Record<string, string | number>;
  body?: T;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
  message?: string;
  timestamp: number;
}

type RouteHandler = (request: ApiRequest) => ApiResponse | Promise<ApiResponse>;

export class RestApiSimulator {
  private routes: Map<string, RouteHandler> = new Map();
  private latencyMs: number = 5;
  private requestLog: ApiRequest[] = [];
  private responseLog: ApiResponse[] = [];

  constructor(latencyMs: number = 5) {
    this.latencyMs = latencyMs;
  }

  register(method: HttpMethod, path: string, handler: RouteHandler): void {
    const key = `${method}:${path}`;
    this.routes.set(key, handler);
  }

  get(path: string, handler: RouteHandler): void {
    this.register('GET', path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.register('POST', path, handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.register('PUT', path, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.register('DELETE', path, handler);
  }

  patch(path: string, handler: RouteHandler): void {
    this.register('PATCH', path, handler);
  }

  private matchRoute(method: HttpMethod, path: string): { handler: RouteHandler; params: Record<string, string> } | null {
    const exactKey = `${method}:${path}`;
    if (this.routes.has(exactKey)) {
      return { handler: this.routes.get(exactKey)!, params: {} };
    }

    const requestParts = path.split('/').filter(Boolean);
    for (const [routeKey, handler] of this.routes.entries()) {
      const [routeMethod, routePath] = routeKey.split(':');
      if (routeMethod !== method) continue;

      const routeParts = routePath.split('/').filter(Boolean);
      if (routeParts.length !== requestParts.length) continue;

      const params: Record<string, string> = {};
      let match = true;
      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].slice(1)] = requestParts[i];
        } else if (routeParts[i] !== requestParts[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        return { handler, params };
      }
    }
    return null;
  }

  async request<T = unknown, B = unknown>(req: ApiRequest<B>): Promise<ApiResponse<T>> {
    this.requestLog.push({ ...req });

    await new Promise(resolve => setTimeout(resolve, this.latencyMs));

    const matched = this.matchRoute(req.method, req.path);
    if (!matched) {
      const response = {
        status: 404,
        ok: false,
        data: null as unknown as T,
        message: `Route not found: ${req.method} ${req.path}`,
        timestamp: Date.now()
      } as ApiResponse<T>;
      this.responseLog.push(response);
      return response;
    }

    try {
      const fullRequest: ApiRequest = { ...req, params: { ...req.params, ...matched.params } };
      const result = await matched.handler(fullRequest);
      this.responseLog.push(result);
      return result as ApiResponse<T>;
    } catch (error) {
      const response = {
        status: 500,
        ok: false,
        data: null as unknown as T,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        timestamp: Date.now()
      } as ApiResponse<T>;
      this.responseLog.push(response);
      return response;
    }
  }

  getRequestLog(): ApiRequest[] {
    return [...this.requestLog];
  }

  getResponseLog(): ApiResponse[] {
    return [...this.responseLog];
  }

  clearLogs(): void {
    this.requestLog = [];
    this.responseLog = [];
  }
}

export function createResponse<T>(status: number, data: T, message?: string): ApiResponse<T> {
  return {
    status,
    ok: status >= 200 && status < 300,
    data,
    message,
    timestamp: Date.now()
  };
}

export function ok<T>(data: T, message?: string): ApiResponse<T> {
  return createResponse(200, data, message);
}

export function created<T>(data: T, message?: string): ApiResponse<T> {
  return createResponse(201, data, message);
}

export function badRequest(message: string): ApiResponse<null> {
  return createResponse(400, null, message);
}

export function notFound(message: string): ApiResponse<null> {
  return createResponse(404, null, message);
}

export const globalApi = new RestApiSimulator(3);
