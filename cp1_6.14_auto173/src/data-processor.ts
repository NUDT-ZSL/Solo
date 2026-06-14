import type { StudyGroup, Member, CheckInRecord } from './mock-api';

export interface RankedMember extends Member {
  rank: number;
  rankChange: number;
  progressPercent: number;
}

export interface AggregatedData {
  groupId: string;
  groupName: string;
  avgWeeklyMinutes: number;
  completionRate: number;
  totalMinutes: number;
  targetMinutes: number;
  membersRanked: RankedMember[];
  maxWeeklyMinutes: number;
}

interface PreviousRankMap {
  [memberId: string]: number;
}

const previousRanksMap: Map<string, PreviousRankMap> = new Map();

export function processGroupData(group: StudyGroup): AggregatedData {
  const members = [...group.members];
  
  members.sort((a, b) => b.weeklyMinutes - a.weeklyMinutes);
  
  const maxWeeklyMinutes = members.length > 0 ? members[0].weeklyMinutes : 1;
  
  const prevRanks = previousRanksMap.get(group.id) || {};
  
  const membersRanked: RankedMember[] = members.map((member, index) => {
    const rank = index + 1;
    const prevRank = prevRanks[member.id] ?? rank;
    const rankChange = prevRank - rank;
    
    return {
      ...member,
      rank,
      rankChange,
      progressPercent: (member.weeklyMinutes / maxWeeklyMinutes) * 100
    };
  });
  
  const newRanks: PreviousRankMap = {};
  membersRanked.forEach(m => {
    newRanks[m.id] = m.rank;
  });
  previousRanksMap.set(group.id, newRanks);
  
  const totalMinutes = members.reduce((sum, m) => sum + m.weeklyMinutes, 0);
  const avgWeeklyMinutes = members.length > 0 ? totalMinutes / members.length : 0;
  const completionRate = group.weeklyTargetMinutes > 0
    ? Math.min((totalMinutes / group.weeklyTargetMinutes) * 100, 100)
    : 0;
  
  return {
    groupId: group.id,
    groupName: group.name,
    avgWeeklyMinutes: Math.round(avgWeeklyMinutes),
    completionRate: Math.round(completionRate * 10) / 10,
    totalMinutes,
    targetMinutes: group.weeklyTargetMinutes,
    membersRanked,
    maxWeeklyMinutes
  };
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) {
    return `${mins} 分钟`;
  }
  if (mins === 0) {
    return `${hours} 小时`;
  }
  return `${hours} 小时 ${mins} 分钟`;
}

export function formatHours(minutes: number): string {
  const hours = (minutes / 60).toFixed(1);
  return `${hours} 小时`;
}

export function filterGroupRecords(
  records: CheckInRecord[],
  groupId: string
): CheckInRecord[] {
  return records.filter(r => r.groupId === groupId);
}

export function getTopMembers(members: RankedMember[], count: number = 3): RankedMember[] {
  return members.slice(0, count);
}
