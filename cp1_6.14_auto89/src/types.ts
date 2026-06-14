export type MasteryLevel = 'unlearned' | 'learning' | 'mastered';

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  level: MasteryLevel;
  estimatedHours: number;
  parentId: string | null;
  childrenIds: string[];
  prerequisites: string[];
}

export interface Dependency {
  fromId: string;
  toId: string;
}

export interface LearningStep {
  nodeId: string;
  name: string;
  description: string;
  estimatedHours: number;
  prerequisites: string[];
  prerequisiteNames: string[];
}

export interface LearningPath {
  steps: LearningStep[];
  totalHours: number;
  remainingHours: number;
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  cycleNodes: string[];
}

export interface DependencyValidationResult {
  valid: boolean;
  reason?: string;
  cycleNodes?: string[];
}
