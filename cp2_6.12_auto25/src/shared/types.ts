export type Language = 'javascript' | 'python' | 'cpp';

export interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  languages: Language[];
  testCases: TestCase[];
  templates: Record<Language, string>;
}

export interface TestCaseResult {
  caseId: number;
  status: 'passed' | 'failed' | 'timeout' | 'error';
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTime: number;
  errorMessage?: string;
}

export interface SubmitRequest {
  code: string;
  language: Language;
  assignmentId: string;
}

export interface SubmitResponse {
  submissionId: string;
  assignmentId: string;
  results: TestCaseResult[];
  totalScore: number;
  maxScore: number;
  timestamp: string;
}

export interface SubmissionRecord {
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  language: Language;
  code: string;
  score: number;
  maxScore: number;
  timestamp: string;
  results: TestCaseResult[];
  statusSummary: string;
}
