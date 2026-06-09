export type Emotion = '怀念' | '惊奇' | '感伤' | '宁静';

export interface Specimen {
  id: string;
  imageUrl: string;
  yearRange: string;
  emotion: Emotion;
  description: string;
  story: string;
  createdAt: number;
}

export async function fetchSpecimens(): Promise<Specimen[]> {
  const response = await fetch('/api/specimens', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function createSpecimen(data: FormData): Promise<Specimen> {
  const response = await fetch('/api/specimens', {
    method: 'POST',
    body: data,
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function deleteSpecimen(id: string): Promise<void> {
  const response = await fetch(`/api/specimens/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}
