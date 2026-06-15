import axios from 'axios';

export interface Question {
  id: string;
  type: 'single' | 'multiple' | 'text';
  text: string;
  options?: string[];
}

export interface Survey {
  _id: string;
  shortId: string;
  title: string;
  questions: Question[];
  createdAt: number;
  responseCount: number;
}

export interface OptionStat {
  name: string;
  count: number;
  percentage: number;
}

export interface WordCloudItem {
  text: string;
  value: number;
}

export interface QuestionStat {
  questionId: string;
  questionText: string;
  type: 'single' | 'multiple' | 'text';
  totalResponses: number;
  options?: OptionStat[];
  wordCloud?: WordCloudItem[];
  allAnswers?: string[];
}

export interface StatsResponse {
  survey: Survey;
  stats: QuestionStat[];
  totalResponses: number;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const surveyApi = {
  createSurvey: async (data: { title: string; questions: Question[] }) => {
    const response = await api.post<Survey>('/surveys', data);
    return response.data;
  },

  getSurvey: async (id: string) => {
    const response = await api.get<Survey>(`/surveys/${id}`);
    return response.data;
  },

  getSurveys: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get<Survey[]>('/surveys', { params });
    return response.data;
  },

  deleteSurvey: async (id: string) => {
    const response = await api.delete(`/surveys/${id}`);
    return response.data;
  },

  submitResponse: async (surveyId: string, data: { answers: (string | string[])[]; clientId: string }) => {
    const response = await api.post(`/surveys/${surveyId}/responses`, data);
    return response.data;
  },

  getStats: async (surveyId: string) => {
    const response = await api.get<StatsResponse>(`/surveys/${surveyId}/stats`);
    return response.data;
  },

  exportExcel: async (surveyId: string) => {
    const response = await api.get(`/surveys/${surveyId}/export`, {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }));
    const link = document.createElement('a');
    link.href = url;
    const contentDisposition = response.headers['content-disposition'];
    let filename = `survey_${Date.now()}.xlsx`;
    if (contentDisposition) {
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
      if (utf8Match) {
        filename = decodeURIComponent(utf8Match[1]);
      } else {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
    }
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
