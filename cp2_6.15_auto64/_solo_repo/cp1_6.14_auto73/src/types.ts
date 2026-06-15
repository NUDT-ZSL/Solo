export type CandidateStage = 'new' | 'screening' | 'interview' | 'offer' | 'hired';

export interface Job {
  id: string;
  title: string;
  department: string;
  headcount: number;
  skills: string[];
  salaryRange: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  date: string;
  timeSlot: string;
  createdAt: string;
}

export interface OfferInfo {
  salary: string;
  onboardDate: string;
  notes: string;
}

export interface Candidate {
  id: string;
  jobId: string;
  name: string;
  phone: string;
  email: string;
  yearsOfExperience: number;
  skills: string[];
  stage: CandidateStage;
  resumeFileName?: string;
  interviews: Interview[];
  offer?: OfferInfo | null;
  createdAt: string;
}

export interface CreateJobPayload {
  title: string;
  department: string;
  headcount: number;
  skills: string[];
  salaryRange: string;
}

export interface UpdateCandidatePayload {
  stage?: CandidateStage;
  interviews?: Interview[];
  offer?: OfferInfo | null;
  name?: string;
  phone?: string;
  email?: string;
  yearsOfExperience?: number;
  skills?: string[];
}

export const STAGE_CONFIG: { key: CandidateStage; label: string; color: string }[] = [
  { key: 'new', label: '新简历', color: '#3498db' },
  { key: 'screening', label: '初筛', color: '#2ecc71' },
  { key: 'interview', label: '面试', color: '#f39c12' },
  { key: 'offer', label: 'Offer', color: '#e74c3c' },
  { key: 'hired', label: '已入职', color: '#9b59b6' },
];
