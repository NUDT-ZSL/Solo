import { create } from 'zustand';
import type {
  Coordinate,
  Waypoints,
  PlannedRoute,
  TrackPoint,
  Note,
} from '../types';

type ToastType = 'success' | 'error' | 'info';

interface AppState {
  waypoints: Waypoints;
  plannedRoute: PlannedRoute | null;
  isPlanning: boolean;
  isRiding: boolean;
  currentRideId: string | null;
  currentPosition: TrackPoint | null;
  trackPoints: TrackPoint[];
  rideNotes: Note[];
  toast: { message: string; visible: boolean; type: ToastType } | null;
  noteBubble: { lat: number; lng: number; visible: boolean } | null;
  historyList: any[];
  setStartPoint: (coord: Coordinate) => void;
  setEndPoint: (coord: Coordinate) => void;
  addViaPoint: (coord: Coordinate) => void;
  removeViaPoint: (index: number) => void;
  clearWaypoints: () => void;
  setPlannedRoute: (route: PlannedRoute | null) => void;
  setIsPlanning: (val: boolean) => void;
  startRide: (rideId: string) => void;
  endRide: () => void;
  setCurrentPosition: (tp: TrackPoint) => void;
  addTrackPoint: (tp: TrackPoint) => void;
  clearTrack: () => void;
  addNote: (note: Note) => void;
  setNotes: (notes: Note[]) => void;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
  showNoteBubble: (lat: number, lng: number) => void;
  hideNoteBubble: () => void;
  setHistoryList: (list: any[]) => void;
  resetAll: () => void;
}

const defaultWaypoints: Waypoints = {
  start: { lat: 39.9042, lng: 116.4074, altitude: 50 },
  vias: [],
  end: { lat: 39.9929, lng: 116.3968, altitude: 55 },
};

export const useAppStore = create<AppState>((set) => ({
  waypoints: defaultWaypoints,
  plannedRoute: null,
  isPlanning: false,
  isRiding: false,
  currentRideId: null,
  currentPosition: null,
  trackPoints: [],
  rideNotes: [],
  toast: null,
  noteBubble: null,
  historyList: [],

  setStartPoint: (coord) =>
    set((s) => ({ waypoints: { ...s.waypoints, start: coord } })),
  setEndPoint: (coord) =>
    set((s) => ({ waypoints: { ...s.waypoints, end: coord } })),
  addViaPoint: (coord) =>
    set((s) => ({ waypoints: { ...s.waypoints, vias: [...s.waypoints.vias, coord] } })),
  removeViaPoint: (index) =>
    set((s) => ({
      waypoints: {
        ...s.waypoints,
        vias: s.waypoints.vias.filter((_, i) => i !== index),
      },
    })),
  clearWaypoints: () => set({ waypoints: defaultWaypoints }),
  setPlannedRoute: (route) => set({ plannedRoute: route }),
  setIsPlanning: (val) => set({ isPlanning: val }),
  startRide: (rideId) =>
    set({ isRiding: true, currentRideId: rideId, trackPoints: [], rideNotes: [] }),
  endRide: () => set({ isRiding: false, currentRideId: null, currentPosition: null }),
  setCurrentPosition: (tp) => set({ currentPosition: tp }),
  addTrackPoint: (tp) =>
    set((s) => ({ trackPoints: [...s.trackPoints, tp], currentPosition: tp })),
  clearTrack: () => set({ trackPoints: [], currentPosition: null }),
  addNote: (note) => set((s) => ({ rideNotes: [...s.rideNotes, note] })),
  setNotes: (notes) => set({ rideNotes: notes }),
  showToast: (message, type = 'info') =>
    set({ toast: { message, visible: true, type } }),
  hideToast: () => set({ toast: null }),
  showNoteBubble: (lat, lng) =>
    set({ noteBubble: { lat, lng, visible: true } }),
  hideNoteBubble: () => set({ noteBubble: null }),
  setHistoryList: (list) => set({ historyList: list }),
  resetAll: () =>
    set({
      waypoints: defaultWaypoints,
      plannedRoute: null,
      isPlanning: false,
      isRiding: false,
      currentRideId: null,
      currentPosition: null,
      trackPoints: [],
      rideNotes: [],
      toast: null,
      noteBubble: null,
    }),
}));

export default useAppStore;
