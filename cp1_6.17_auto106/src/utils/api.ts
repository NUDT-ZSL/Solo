import type {
  Survey,
  SurveyComponent,
  SurveyResponse,
  Answer,
  AggregatedData,
  HourlyResponse
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const surveyApi = {
  createSurvey: (title: string, components: SurveyComponent[]) =>
    request<{ id: string; code: string }>('/surveys', {
      method: 'POST',
      body: JSON.stringify({ title, components })
    }),

  getSurveys: () => request<Survey[]>('/surveys'),

  getSurvey: (id: string) => request<Survey>(`/surveys/${id}`),

  submitResponse: (surveyId: string, answers: Answer[]) =>
    request<{ id: string }>('/responses', {
      method: 'POST',
      body: JSON.stringify({ surveyId, answers })
    }),

  getResponses: (surveyId: string) =>
    request<SurveyResponse[]>(`/surveys/${surveyId}/responses`),

  getAggregatedData: (surveyId: string) =>
    request<AggregatedData[]>(`/surveys/${surveyId}/responses/aggregate`),

  getHourlyResponses: (surveyId: string) =>
    request<HourlyResponse[]>(`/surveys/${surveyId}/responses/hourly`),

  createDemoData: () =>
    request<{ survey: Survey; responsesCount: number }>('/surveys/demo', {
      method: 'POST'
    })
};
