export type Skill = '教学' | '翻译' | '技术' | '设计' | '医疗';

export interface Volunteer {
  id: string;
  name: string;
  skills: Skill[];
}

export interface Activity {
  id: string;
  name: string;
  date: string;
  requiredSkills: Skill[];
  maxParticipants: number;
  currentParticipants: number;
}

export interface ServiceRecord {
  id: string;
  volunteerName: string;
  activityId: string;
  activityName: string;
  date: string;
  hours: number;
  skills: Skill[];
}

export interface MatchedActivity extends Activity {
  matchScore: number;
  isRecommended: boolean;
}

export interface SkillDistribution {
  name: Skill;
  value: number;
}

export interface MonthlyTrend {
  month: string;
  hours: number;
}

export interface VolunteerReport {
  volunteerName: string;
  totalHours: number;
  activityCount: number;
  skillDistribution: SkillDistribution[];
  monthlyTrend: MonthlyTrend[];
}

export interface DashboardStats {
  weeklyHours: number;
  activeVolunteers: number;
  topActivities: { name: string; count: number }[];
}

export const SKILL_COLORS: Record<Skill, string> = {
  教学: '#E74C3C',
  翻译: '#3498DB',
  技术: '#2ECC71',
  设计: '#9B59B6',
  医疗: '#F39C12',
};

export const ALL_SKILLS: Skill[] = ['教学', '翻译', '技术', '设计', '医疗'];
