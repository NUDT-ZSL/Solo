export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface Endpoint {
  id: string;
  method: HttpMethod;
  path: string;
  statusCode: number;
  responseBody: string;
  delay: number;
  createdAt: number;
  updatedAt: number;
}

export interface EndpointCreateRequest {
  method: HttpMethod;
  path: string;
  statusCode: number;
  responseBody: string;
  delay: number;
}

export interface EndpointUpdateRequest extends EndpointCreateRequest {
  id: string;
}

export interface TestResponse {
  status: number;
  statusText: string;
  data: any;
  time: number;
}
