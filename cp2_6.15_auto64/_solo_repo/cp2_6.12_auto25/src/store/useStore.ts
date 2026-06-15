import { create } from 'zustand';
import axios from 'axios';
import type {
  Assignment,
  Language,
  SubmitResponse,
  SubmissionRecord,
  TestCaseResult,
} from '@/shared/types';

const HISTORY_KEY = 'codejudge_history';
const MAX_HISTORY = 20;

interface AppState {
  assignments: Assignment[];
  selectedAssignment: Assignment | null;
  currentCode: string;
  currentLanguage: Language;
  evaluationResults: TestCaseResult[] | null;
  evaluationResponse: SubmitResponse | null;
  isSubmitting: boolean;
  submissionHistory: SubmissionRecord[];
  sidebarOpen: boolean;

  fetchAssignments: () => Promise<void>;
  selectAssignment: (id: string) => void;
  setCode: (code: string) => void;
  setLanguage: (lang: Language) => void;
  submitCode: () => Promise<void>;
  loadHistory: () => void;
  viewHistoryItem: (submissionId: string) => void;
  toggleSidebar: () => void;
  clearResults: () => void;
}

function loadHistoryFromStorage(): SubmissionRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistoryToStorage(history: SubmissionRecord[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function buildStatusSummary(results: TestCaseResult[]): string {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const timeout = results.filter(r => r.status === 'timeout').length;
  const error = results.filter(r => r.status === 'error').length;
  const parts: string[] = [];
  if (passed > 0) parts.push(`${passed} passed`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (timeout > 0) parts.push(`${timeout} timeout`);
  if (error > 0) parts.push(`${error} error`);
  return parts.join(', ') || 'no results';
}

export const useStore = create<AppState>((set, get) => ({
  assignments: [],
  selectedAssignment: null,
  currentCode: '',
  currentLanguage: 'javascript',
  evaluationResults: null,
  evaluationResponse: null,
  isSubmitting: false,
  submissionHistory: loadHistoryFromStorage(),
  sidebarOpen: true,

  fetchAssignments: async () => {
    try {
      const res = await axios.get<Assignment[]>('/api/assignments');
      set({ assignments: res.data });
      if (res.data.length > 0 && !get().selectedAssignment) {
        const first = res.data[0];
        set({
          selectedAssignment: first,
          currentCode: first.templates[first.languages[0]] || '',
          currentLanguage: first.languages[0],
        });
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  },

  selectAssignment: (id: string) => {
    const assignment = get().assignments.find(a => a.id === id);
    if (!assignment) return;
    const lang = get().currentLanguage;
    const useLang = assignment.languages.includes(lang) ? lang : assignment.languages[0];
    set({
      selectedAssignment: assignment,
      currentLanguage: useLang,
      currentCode: assignment.templates[useLang] || '',
      evaluationResults: null,
      evaluationResponse: null,
    });
  },

  setCode: (code: string) => set({ currentCode: code }),

  setLanguage: (lang: Language) => {
    const assignment = get().selectedAssignment;
    if (!assignment) return;
    set({
      currentLanguage: lang,
      currentCode: assignment.templates[lang] || '',
    });
  },

  submitCode: async () => {
    const { currentCode, currentLanguage, selectedAssignment } = get();
    if (!selectedAssignment || !currentCode.trim()) return;

    set({ isSubmitting: true, evaluationResults: null, evaluationResponse: null });

    try {
      const res = await axios.post<SubmitResponse>('/api/submit', {
        code: currentCode,
        language: currentLanguage,
        assignmentId: selectedAssignment.id,
      });

      const response = res.data;
      set({
        evaluationResults: response.results,
        evaluationResponse: response,
        isSubmitting: false,
      });

      const record: SubmissionRecord = {
        submissionId: response.submissionId,
        assignmentId: selectedAssignment.id,
        assignmentTitle: selectedAssignment.title,
        language: currentLanguage,
        code: currentCode,
        score: response.totalScore,
        maxScore: response.maxScore,
        timestamp: response.timestamp,
        results: response.results,
        statusSummary: buildStatusSummary(response.results),
      };

      const history = [record, ...get().submissionHistory].slice(0, MAX_HISTORY);
      set({ submissionHistory: history });
      saveHistoryToStorage(history);
    } catch (err) {
      console.error('Submit failed:', err);
      set({ isSubmitting: false });
    }
  },

  loadHistory: () => {
    set({ submissionHistory: loadHistoryFromStorage() });
  },

  viewHistoryItem: (submissionId: string) => {
    const item = get().submissionHistory.find(h => h.submissionId === submissionId);
    if (!item) return;
    const assignment = get().assignments.find(a => a.id === item.assignmentId);
    set({
      evaluationResults: item.results,
      evaluationResponse: {
        submissionId: item.submissionId,
        assignmentId: item.assignmentId,
        results: item.results,
        totalScore: item.score,
        maxScore: item.maxScore,
        timestamp: item.timestamp,
      },
      selectedAssignment: assignment || null,
      currentLanguage: item.language,
      currentCode: item.code,
    });
  },

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  clearResults: () => set({ evaluationResults: null, evaluationResponse: null }),
}));
