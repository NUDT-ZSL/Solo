import { create } from "zustand";
import { Capsule, createCapsule, getAllCapsules } from "@/utils/CapsuleManager";

interface CapsuleState {
  capsules: Capsule[];
  loadCapsules: () => void;
  addCapsule: (content: string, daysOffset: number) => Capsule;
}

export const useCapsuleStore = create<CapsuleState>((set) => ({
  capsules: [],
  loadCapsules: () => {
    set({ capsules: getAllCapsules() });
  },
  addCapsule: (content: string, daysOffset: number) => {
    const capsule = createCapsule(content, daysOffset);
    set((state) => ({ capsules: [...state.capsules, capsule] }));
    return capsule;
  },
}));
