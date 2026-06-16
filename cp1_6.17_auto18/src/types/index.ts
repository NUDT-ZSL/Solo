export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'core'
  | 'glutes';

export interface Exercise {
  id: string;
  name: string;
  targetMuscle: MuscleGroup;
  category: 'compound' | 'isolation';
  gifUrl: string;
  description: string;
}

export interface ExerciseInTemplate extends Exercise {
  sets: number;
  reps: number;
  restSeconds: number;
}

export interface SuperSet {
  id: string;
  exercises: ExerciseInTemplate[];
  isSuperSet: boolean;
}

export interface TrainingTemplate {
  id: string;
  name: string;
  exercises: (ExerciseInTemplate | SuperSet)[];
  createdAt: string;
}

export interface SetRecord {
  exerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  duration: number;
  completedAt: string;
}

export interface TrainingSession {
  id: string;
  templateId: string;
  templateName: string;
  records: SetRecord[];
  totalVolume: number;
  estimatedCalories: number;
  startedAt: string;
  completedAt: string;
}

export type UserLevel = 'beginner' | 'intermediate' | 'advanced';

export type TrainingGoal = 'muscle_gain' | 'fat_loss' | 'strength';

export interface PlanParams {
  level: UserLevel;
  goal: TrainingGoal;
  daysPerWeek: number;
}

export interface DayPlan {
  day: number;
  label: string;
  exercises: ExerciseInTemplate[];
  estimatedDuration: number;
  totalSets: number;
}
