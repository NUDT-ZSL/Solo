import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Timeline, TimelineEvent, Dependency, Collaborator } from '../../shared/types';

interface AppState {
  timelines: Timeline[];
  currentTimeline: Timeline | null;
  collaborators: Collaborator[];
  zoom: number;
  pan: { x: number; y: number };
  selectedEventId: string | null;
  draggedEventId: string | null;
  hoveredEventId: string | null;
  isModalOpen: boolean;
  editingEvent: TimelineEvent | null;
  wsConnected: boolean;
  userName: string;
  userId: string;
  sidebarOpen: boolean;

  setTimelines: (timelines: Timeline[]) => void;
  setCurrentTimeline: (timeline: Timeline | null) => void;
  setCollaborators: (collaborators: Collaborator[]) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setSelectedEventId: (id: string | null) => void;
  setDraggedEventId: (id: string | null) => void;
  setHoveredEventId: (id: string | null) => void;
  setModalOpen: (open: boolean) => void;
  setEditingEvent: (event: TimelineEvent | null) => void;
  setWsConnected: (connected: boolean) => void;
  setSidebarOpen: (open: boolean) => void;

  addTimeline: (timeline: Omit<Timeline, 'id' | 'shareCode' | 'events' | 'dependencies' | 'createdAt' | 'updatedAt'>) => void;
  updateTimeline: (id: string, updates: Partial<Timeline>) => void;
  deleteTimeline: (id: string) => void;

  addEvent: (event: Omit<TimelineEvent, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  deleteEvent: (id: string) => void;

  addDependency: (dependency: Omit<Dependency, 'id'>) => void;
  deleteDependency: (id: string) => void;

  lockEvent: (eventId: string) => void;
  unlockEvent: (eventId: string) => void;
}

const loadTimelines = (): Timeline[] => {
  try {
    const saved = localStorage.getItem('timelines');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveTimelines = (timelines: Timeline[]) => {
  localStorage.setItem('timelines', JSON.stringify(timelines));
};

const getUserId = (): string => {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem('userId', userId);
  }
  return userId;
};

const getUserName = (): string => {
  let userName = localStorage.getItem('userName');
  if (!userName) {
    userName = 'User' + Math.floor(Math.random() * 10000);
    localStorage.setItem('userName', userName);
  }
  return userName;
};

export const useStore = create<AppState>((set, get) => ({
  timelines: loadTimelines(),
  currentTimeline: null,
  collaborators: [],
  zoom: 1,
  pan: { x: 0, y: 0 },
  selectedEventId: null,
  draggedEventId: null,
  hoveredEventId: null,
  isModalOpen: false,
  editingEvent: null,
  wsConnected: false,
  userName: getUserName(),
  userId: getUserId(),
  sidebarOpen: true,

  setTimelines: (timelines) => {
    set({ timelines });
    saveTimelines(timelines);
  },
  setCurrentTimeline: (timeline) => set({ currentTimeline: timeline }),
  setCollaborators: (collaborators) => set({ collaborators }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  setDraggedEventId: (id) => set({ draggedEventId: id }),
  setHoveredEventId: (id) => set({ hoveredEventId: id }),
  setModalOpen: (open) => set({ isModalOpen: open }),
  setEditingEvent: (event) => set({ editingEvent: event }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  addTimeline: (data) => {
    const newTimeline: Timeline = {
      id: uuidv4(),
      shareCode: Math.random().toString(36).substring(2, 10),
      events: [],
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...data,
    };
    const timelines = [...get().timelines, newTimeline];
    set({ timelines, currentTimeline: newTimeline });
    saveTimelines(timelines);
  },
  updateTimeline: (id, updates) => {
    const timelines = get().timelines.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
    );
    const currentTimeline = get().currentTimeline?.id === id
      ? { ...get().currentTimeline, ...updates, updatedAt: Date.now() }
      : get().currentTimeline;
    set({ timelines, currentTimeline });
    saveTimelines(timelines);
  },
  deleteTimeline: (id) => {
    const timelines = get().timelines.filter((t) => t.id !== id);
    const currentTimeline = get().currentTimeline?.id === id ? null : get().currentTimeline;
    set({ timelines, currentTimeline });
    saveTimelines(timelines);
  },

  addEvent: (eventData) => {
    const currentTimeline = get().currentTimeline;
    if (!currentTimeline) return;

    const newEvent: TimelineEvent = {
      id: uuidv4(),
      ...eventData,
    };
    const updatedTimeline = {
      ...currentTimeline,
      events: [...currentTimeline.events, newEvent],
      updatedAt: Date.now(),
    };
    const timelines = get().timelines.map((t) =>
      t.id === currentTimeline.id ? updatedTimeline : t
    );
    set({ timelines, currentTimeline: updatedTimeline });
    saveTimelines(timelines);
  },
  updateEvent: (id, updates) => {
    const currentTimeline = get().currentTimeline;
    if (!currentTimeline) return;

    const events = currentTimeline.events.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    );
    const updatedTimeline = {
      ...currentTimeline,
      events,
      updatedAt: Date.now(),
    };
    const timelines = get().timelines.map((t) =>
      t.id === currentTimeline.id ? updatedTimeline : t
    );
    set({ timelines, currentTimeline: updatedTimeline });
    saveTimelines(timelines);
  },
  deleteEvent: (id) => {
    const currentTimeline = get().currentTimeline;
    if (!currentTimeline) return;

    const events = currentTimeline.events.filter((e) => e.id !== id);
    const dependencies = currentTimeline.dependencies.filter(
      (d) => d.from !== id && d.to !== id
    );
    const updatedTimeline = {
      ...currentTimeline,
      events,
      dependencies,
      updatedAt: Date.now(),
    };
    const timelines = get().timelines.map((t) =>
      t.id === currentTimeline.id ? updatedTimeline : t
    );
    set({ timelines, currentTimeline: updatedTimeline });
    saveTimelines(timelines);
  },

  addDependency: (depData) => {
    const currentTimeline = get().currentTimeline;
    if (!currentTimeline) return;

    const newDep: Dependency = {
      id: uuidv4(),
      ...depData,
    };
    const updatedTimeline = {
      ...currentTimeline,
      dependencies: [...currentTimeline.dependencies, newDep],
      updatedAt: Date.now(),
    };
    const timelines = get().timelines.map((t) =>
      t.id === currentTimeline.id ? updatedTimeline : t
    );
    set({ timelines, currentTimeline: updatedTimeline });
    saveTimelines(timelines);
  },
  deleteDependency: (id) => {
    const currentTimeline = get().currentTimeline;
    if (!currentTimeline) return;

    const dependencies = currentTimeline.dependencies.filter((d) => d.id !== id);
    const updatedTimeline = {
      ...currentTimeline,
      dependencies,
      updatedAt: Date.now(),
    };
    const timelines = get().timelines.map((t) =>
      t.id === currentTimeline.id ? updatedTimeline : t
    );
    set({ timelines, currentTimeline: updatedTimeline });
    saveTimelines(timelines);
  },

  lockEvent: (eventId) => {
    const { userId, userName } = get();
    get().updateEvent(eventId, { lockedBy: userId, lockedByName: userName });
  },
  unlockEvent: (eventId) => {
    get().updateEvent(eventId, { lockedBy: undefined, lockedByName: undefined });
  },
}));
