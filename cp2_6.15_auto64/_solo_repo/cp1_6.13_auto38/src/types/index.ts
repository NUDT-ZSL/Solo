export interface Layer {
  _id: string;
  name: string;
  era: string;
  period: string;
  ageStart: number;
  ageEnd: number;
  thickness: number;
  color: string;
  fossilIds: string[];
  order: number;
}

export interface Fossil {
  _id: string;
  name: string;
  era: string;
  latinName: string;
  description: string;
  modelType: string;
  discoveryLocation: string;
  characteristics: string;
}

export type AnimationSpeed = 0.5 | 1 | 2;
