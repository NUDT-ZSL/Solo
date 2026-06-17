export type ComponentType = 'radio' | 'checkbox' | 'rating' | 'text' | 'select';

export interface SurveyComponent {
  id: string;
  type: ComponentType;
  label: string;
  options?: string[];
  required?: boolean;
}

export interface Survey {
  id: string;
  code: string;
  title: string;
  components: SurveyComponent[];
  createdAt: string;
}

export interface Answer {
  componentId: string;
  value: string | string[] | number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: Answer[];
  submittedAt: string;
}

export interface RatingStats {
  average: number;
  distribution: { [score: number]: number };
}

export interface AggregatedData {
  componentId: string;
  type: ComponentType;
  label: string;
  optionCounts?: { [key: string]: number };
  ratingStats?: RatingStats;
  textAnswers?: string[];
}

export interface HourlyResponse {
  hour: string;
  count: number;
}
