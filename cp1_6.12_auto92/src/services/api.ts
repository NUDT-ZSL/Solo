export interface Contract {
  id: string;
  name: string;
  lastModified: number;
  latestVersion: string | null;
}

export interface Annotation {
  id: string;
  contractId: string;
  versionId: string;
  lineNumber: number;
  content: string;
  status: 'pending' | 'confirmed' | 'approved' | 'rejected';
  author: string;
  createdAt: number;
  updatedAt: number;
}

export interface ContractVersion {
  id: string;
  version: string;
  submitter: string;
  createdAt: number;
  content: string;
  annotations: Annotation[];
}

export interface DiffLine {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  content: string;
  leftLineNumber: number | null;
  rightLineNumber: number | null;
}

export interface DiffResult {
  leftLines: DiffLine[];
  rightLines: DiffLine[];
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

const API_BASE = '/api';

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const getContracts = (): Promise<Contract[]> =>
  request<Contract[]>('/contracts');

export const getContractVersions = (contractId: string): Promise<ContractVersion[]> =>
  request<ContractVersion[]>(`/contract/${contractId}/versions`);

export const createAnnotation = (
  contractId: string,
  data: { versionId: string; lineNumber: number; content: string }
): Promise<Annotation> =>
  request<Annotation>(`/contract/${contractId}/annotation`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateAnnotation = (
  annotationId: string,
  data: { content?: string; status?: Annotation['status'] }
): Promise<Annotation> =>
  request<Annotation>(`/annotation/${annotationId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteAnnotation = (annotationId: string): Promise<{ success: boolean }> =>
  request<{ success: boolean }>(`/annotation/${annotationId}`, {
    method: 'DELETE',
  });

export interface ExportPayload {
  contractName: string;
  oldVersion: string;
  newVersion: string;
  submitterOld: string;
  submitterNew: string;
  diffSummary: { added: number; removed: number; modified: number };
  annotations: Array<{
    id: string;
    version: string;
    lineNumber: number;
    content: string;
    status: Annotation['status'];
    author: string;
    createdAt: number;
  }>;
}

export const exportReport = async (contractId: string, payload: ExportPayload): Promise<{ url: string; filename: string }> => {
  const response = await fetch(`${API_BASE}/contract/${contractId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch ? filenameMatch[1] : `ContractFlow_${payload.contractName}.pdf`;
  const url = URL.createObjectURL(blob);
  return { url, filename };
};
