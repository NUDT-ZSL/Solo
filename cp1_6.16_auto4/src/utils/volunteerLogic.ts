import type {
  Activity,
  MatchedActivity,
  ServiceRecord,
  Skill,
  SkillDistribution,
  VolunteerReport,
  DashboardStats,
  MonthlyTrend,
  Volunteer,
} from '../types';
import { ALL_SKILLS } from '../types';

const MATCH_THRESHOLD = 0.6;

export function calculateSkillMatch(
  volunteerSkills: Skill[],
  requiredSkills: Skill[]
): number {
  if (requiredSkills.length === 0) return 1;
  if (volunteerSkills.length === 0) return 0;

  const volunteerSet = new Set(volunteerSkills);
  let matched = 0;

  for (const skill of requiredSkills) {
    if (volunteerSet.has(skill)) {
      matched++;
    }
  }

  return matched / requiredSkills.length;
}

export function matchActivitiesToVolunteer(
  activities: Activity[],
  volunteer: Volunteer | null,
  volunteerSkills: Skill[]
): MatchedActivity[] {
  const skills = volunteer?.skills.length ? volunteer.skills : volunteerSkills;

  return activities
    .map((activity) => {
      const matchScore = calculateSkillMatch(skills, activity.requiredSkills);
      return {
        ...activity,
        matchScore,
        isRecommended: matchScore >= MATCH_THRESHOLD,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function calculateTotalHours(records: ServiceRecord[], volunteerName?: string): number {
  const filtered = volunteerName
    ? records.filter((r) => r.volunteerName === volunteerName)
    : records;
  return filtered.reduce((sum, r) => sum + r.hours, 0);
}

export function calculateWeeklyHours(records: ServiceRecord[]): number {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  return records
    .filter((r) => {
      const recordDate = new Date(r.date);
      return recordDate >= weekStart && recordDate <= now;
    })
    .reduce((sum, r) => sum + r.hours, 0);
}

export function countActiveVolunteers(records: ServiceRecord[]): number {
  const uniqueNames = new Set(records.map((r) => r.volunteerName));
  return uniqueNames.size;
}

export function getTopActivities(records: ServiceRecord[], limit = 3): { name: string; count: number }[] {
  const activityCount = new Map<string, number>();

  for (const record of records) {
    const current = activityCount.get(record.activityName) ?? 0;
    activityCount.set(record.activityName, current + 1);
  }

  return Array.from(activityCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function calculateSkillDistribution(records: ServiceRecord[], volunteerName?: string): SkillDistribution[] {
  const filtered = volunteerName
    ? records.filter((r) => r.volunteerName === volunteerName)
    : records;

  const skillCount: Record<Skill, number> = {
    教学: 0,
    翻译: 0,
    技术: 0,
    设计: 0,
    医疗: 0,
  };

  for (const record of filtered) {
    for (const skill of record.skills) {
      skillCount[skill] = (skillCount[skill] ?? 0) + record.hours;
    }
  }

  return ALL_SKILLS
    .filter((skill) => skillCount[skill] > 0)
    .map((skill) => ({
      name: skill,
      value: skillCount[skill],
    }));
}

export function calculateMonthlyTrend(records: ServiceRecord[], volunteerName?: string): MonthlyTrend[] {
  const filtered = volunteerName
    ? records.filter((r) => r.volunteerName === volunteerName)
    : records;

  const monthlyMap = new Map<string, number>();

  for (const record of filtered) {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = monthlyMap.get(monthKey) ?? 0;
    monthlyMap.set(monthKey, current + record.hours);
  }

  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, hours]) => ({ month, hours }));
}

export function generateVolunteerReport(
  records: ServiceRecord[],
  volunteerName: string
): VolunteerReport {
  const volunteerRecords = records.filter((r) => r.volunteerName === volunteerName);

  return {
    volunteerName,
    totalHours: calculateTotalHours(records, volunteerName),
    activityCount: new Set(volunteerRecords.map((r) => r.activityId)).size,
    skillDistribution: calculateSkillDistribution(records, volunteerName),
    monthlyTrend: calculateMonthlyTrend(records, volunteerName),
  };
}

export function generateDashboardStats(records: ServiceRecord[]): DashboardStats {
  return {
    weeklyHours: calculateWeeklyHours(records),
    activeVolunteers: countActiveVolunteers(records),
    topActivities: getTopActivities(records),
  };
}
