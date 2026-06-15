import { ItineraryData } from '../context/ItineraryContext';

export interface GenerateParams {
  budget: number;
  days: number;
  preference: string;
}

export const generateItinerary = async (params: GenerateParams): Promise<ItineraryData> => {
  const response = await fetch('/api/generate-itinerary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('生成行程失败');
  }

  return response.json();
};

export const getItineraryById = async (id: string): Promise<ItineraryData> => {
  const response = await fetch(`/api/itinerary/${id}`);

  if (!response.ok) {
    throw new Error('获取行程失败');
  }

  return response.json();
};
