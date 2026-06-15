import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Coordinate,
  PlannedRoute,
  TrackPoint,
  Note,
  Waypoints,
} from './types';

interface NoteBubbleState {
  visible: boolean;
  lat: number;
  lng: number;
}

interface AppState {
  waypoints: Waypoints;
  plannedRoute: PlannedRoute | null;
  trackPoints: TrackPoint[];
  currentPosition: TrackPoint | null;
  notes: Note[];
  noteBubble: NoteBubbleState;

  setStartPoint: (coord: Coordinate) => void;
  setEndPoint: (coord: Coordinate) => void;
  addViaPoint: (coord: Coordinate) => void;
  clearWaypoints: () => void;
  setPlannedRoute: (route: PlannedRoute | null) => void;
  addTrackPoint: (point: TrackPoint) => void;
  setCurrentPosition: (pos: TrackPoint | null) => void;
  resetRideState: () => void;
  showNoteBubble: (lat: number, lng: number) => void;
  hideNoteBubble: () => void;
  addNote: (text: string) => Note | null;
  setNotes: (notes: Note[]) => void;
}

const emptyWaypoints: Waypoints = {
  start: null as unknown as Coordinate,
  vias: [],
  end: null as unknown as Coordinate,
};

export const useAppStore = create<AppState>((set, get) => ({
  waypoints: emptyWaypoints,
  plannedRoute: null,
  trackPoints: [],
  currentPosition: null,
  notes: [],
  noteBubble: { visible: false, lat: 0, lng: 0 },

  setStartPoint: (coord: Coordinate) =>
    set((state) => ({
      waypoints: { ...state.waypoints, start: coord },
    })),

  setEndPoint: (coord: Coordinate) =>
    set((state) => ({
      waypoints: { ...state.waypoints, end: coord },
    })),

  addViaPoint: (coord: Coordinate) =>
    set((state) => {
      if (state.waypoints.vias.length >= 5) return state;
      return {
        waypoints: {
          ...state.waypoints,
          vias: [...state.waypoints.vias, coord],
        },
      };
    }),

  clearWaypoints: () =>
    set({
      waypoints: emptyWaypoints,
      plannedRoute: null,
    }),

  setPlannedRoute: (route: PlannedRoute | null) =>
    set({ plannedRoute: route }),

  addTrackPoint: (point: TrackPoint) =>
    set((state) => ({
      trackPoints: [...state.trackPoints, point],
      currentPosition: point,
    })),

  setCurrentPosition: (pos: TrackPoint | null) =>
    set({ currentPosition: pos }),

  resetRideState: () =>
    set({
      trackPoints: [],
      currentPosition: null,
      notes: [],
      noteBubble: { visible: false, lat: 0, lng: 0 },
    }),

  showNoteBubble: (lat: number, lng: number) =>
    set({ noteBubble: { visible: true, lat, lng } }),

  hideNoteBubble: () =>
    set((state) => ({ noteBubble: { ...state.noteBubble, visible: false } })),

  addNote: (text: string): Note | null => {
    const state = get();
    if (!state.noteBubble.visible) return null;
    const note: Note = {
      id: uuidv4(),
      lat: state.noteBubble.lat,
      lng: state.noteBubble.lng,
      text,
      timestamp: Date.now(),
    };
    set((s) => ({
      notes: [...s.notes, note],
      noteBubble: { ...s.noteBubble, visible: false },
    }));
    return note;
  },

  setNotes: (notes: Note[]) => set({ notes }),
}));

export default useAppStore;
