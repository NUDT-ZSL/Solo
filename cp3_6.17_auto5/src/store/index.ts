import { create } from 'zustand';
import { Course, KnowledgePoint, KnowledgeRelation, User, Assessment, ReviewRecord } from '../types';

interface AppState {
  currentUser: User | null;
  currentCourse: Course | null;
  courses: Course[];
  knowledgePoints: KnowledgePoint[];
  relations: KnowledgeRelation[];
  assessments: Assessment[];
  reviewRecords: ReviewRecord[];
  selectedPoint: KnowledgePoint | null;
  recommendPath: string[];
  filterTag: string | null;
  
  setCurrentUser: (user: User | null) => void;
  setCurrentCourse: (course: Course | null) => void;
  setCourses: (courses: Course[]) => void;
  setKnowledgePoints: (points: KnowledgePoint[]) => void;
  setRelations: (relations: KnowledgeRelation[]) => void;
  setAssessments: (assessments: Assessment[]) => void;
  setReviewRecords: (records: ReviewRecord[]) => void;
  setSelectedPoint: (point: KnowledgePoint | null) => void;
  setRecommendPath: (path: string[]) => void;
  setFilterTag: (tag: string | null) => void;
  
  addKnowledgePoint: (point: KnowledgePoint) => void;
  updateKnowledgePoint: (point: KnowledgePoint) => void;
  addRelation: (relation: KnowledgeRelation) => void;
  removeFromPath: (pointId: string) => void;
  addReviewRecord: (record: ReviewRecord) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  currentCourse: null,
  courses: [],
  knowledgePoints: [],
  relations: [],
  assessments: [],
  reviewRecords: [],
  selectedPoint: null,
  recommendPath: [],
  filterTag: null,

  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentCourse: (course) => set({ currentCourse: course }),
  setCourses: (courses) => set({ courses }),
  setKnowledgePoints: (points) => set({ knowledgePoints: points }),
  setRelations: (relations) => set({ relations }),
  setAssessments: (assessments) => set({ assessments }),
  setReviewRecords: (records) => set({ reviewRecords: records }),
  setSelectedPoint: (point) => set({ selectedPoint: point }),
  setRecommendPath: (path) => set({ recommendPath: path }),
  setFilterTag: (tag) => set({ filterTag: tag }),

  addKnowledgePoint: (point) =>
    set((state) => ({ knowledgePoints: [...state.knowledgePoints, point] })),
  
  updateKnowledgePoint: (point) =>
    set((state) => ({
      knowledgePoints: state.knowledgePoints.map((p) =>
        p.id === point.id ? point : p
      ),
    })),
  
  addRelation: (relation) =>
    set((state) => ({ relations: [...state.relations, relation] })),
  
  removeFromPath: (pointId) =>
    set((state) => ({
      recommendPath: state.recommendPath.filter((id) => id !== pointId),
    })),
  
  addReviewRecord: (record) =>
    set((state) => ({ reviewRecords: [...state.reviewRecords, record] })),
}));
