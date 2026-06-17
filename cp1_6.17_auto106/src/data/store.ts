import { create } from 'zustand';
import type { SurveyComponent, Survey } from '../types';

interface EditorState {
  components: SurveyComponent[];
  surveyTitle: string;
  currentSurveyId: string | null;
  currentSurveyCode: string | null;
  addComponent: (component: SurveyComponent) => void;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, updates: Partial<SurveyComponent>) => void;
  reorderComponents: (startIndex: number, endIndex: number) => void;
  setSurveyTitle: (title: string) => void;
  setCurrentSurvey: (id: string, code: string) => void;
  clearEditor: () => void;
  loadSurvey: (survey: Survey) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  components: [],
  surveyTitle: '未命名问卷',
  currentSurveyId: null,
  currentSurveyCode: null,

  addComponent: (component) =>
    set((state) => ({ components: [...state.components, component] })),

  removeComponent: (id) =>
    set((state) => ({
      components: state.components.filter((c) => c.id !== id)
    })),

  updateComponent: (id, updates) =>
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      )
    })),

  reorderComponents: (startIndex, endIndex) =>
    set((state) => {
      const result = Array.from(state.components);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { components: result };
    }),

  setSurveyTitle: (title) => set({ surveyTitle: title }),

  setCurrentSurvey: (id, code) =>
    set({ currentSurveyId: id, currentSurveyCode: code }),

  clearEditor: () =>
    set({
      components: [],
      surveyTitle: '未命名问卷',
      currentSurveyId: null,
      currentSurveyCode: null
    }),

  loadSurvey: (survey) =>
    set({
      components: survey.components,
      surveyTitle: survey.title,
      currentSurveyId: survey.id,
      currentSurveyCode: survey.code
    })
}));
