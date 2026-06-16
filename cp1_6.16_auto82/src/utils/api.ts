export interface Sample {
  id: string;
  text: string;
  duration: number;
  phonemes: string[];
}

export interface SampleDetail extends Sample {
  language: string;
  level: number;
  features: number[][];
}

export interface Recording {
  id: string;
  userId: string;
  sampleId: string;
  score: number;
  audioDuration: number;
  createdAt: string;
  phonemeScores: { phoneme: string; score: number }[];
}

export interface UserStats {
  recentScores: { date: string; score: number }[];
  phonemeAccuracy: { phoneme: string; accuracy: number }[];
  totalPractices: number;
  averageScore: number;
}

export interface UserInfo {
  name: string;
  points: number;
  avatar: string;
}

const API_BASE = '/api';

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const getSamples = async (
  language: string,
  level: number
): Promise<Sample[]> => {
  const response = await fetch(
    `${API_BASE}/samples?language=${language}&level=${level}`
  );
  return handleResponse<Sample[]>(response);
};

export const getSampleDetail = async (id: string): Promise<SampleDetail> => {
  const response = await fetch(`${API_BASE}/samples/${id}`);
  return handleResponse<SampleDetail>(response);
};

export const getSampleAudioUrl = (id: string): string => {
  return `${API_BASE}/samples/${id}/audio`;
};

export const submitRecording = async (
  userId: string,
  sampleId: string,
  score: number,
  audioDuration: number,
  phonemeScores: { phoneme: string; score: number }[]
): Promise<Recording> => {
  const response = await fetch(`${API_BASE}/recordings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      sampleId,
      score,
      audioDuration,
      phonemeScores
    })
  });
  return handleResponse<Recording>(response);
};

export const getUserRecords = async (
  userId: string,
  limit?: number
): Promise<Recording[]> => {
  let url = `${API_BASE}/records?userId=${userId}`;
  if (limit) {
    url += `&limit=${limit}`;
  }
  const response = await fetch(url);
  return handleResponse<Recording[]>(response);
};

export const getUserInfo = async (userId: string): Promise<UserInfo> => {
  const response = await fetch(`${API_BASE}/users/${userId}`);
  return handleResponse<UserInfo>(response);
};

export const getUserStats = async (userId: string): Promise<UserStats> => {
  const response = await fetch(`${API_BASE}/stats/${userId}`);
  return handleResponse<UserStats>(response);
};
