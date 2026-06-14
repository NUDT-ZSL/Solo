import { describe, it, expect } from 'vitest';
import { computeMonthlyStats, computeLeaderboard } from './data-processor';
import type { Activity, Volunteer } from './mock-api';

describe('computeMonthlyStats', () => {
  const mockActivities: Activity[] = [
    { id: '1', date: '2026-01-15', volunteerId: 'v-1', type: '垃圾分类宣传', duration: 60 },
    { id: '2', date: '2026-01-20', volunteerId: 'v-2', type: '河道清洁', duration: 90 },
    { id: '3', date: '2026-02-10', volunteerId: 'v-1', type: '植树', duration: 120 },
    { id: '4', date: '2026-02-15', volunteerId: 'v-3', type: '垃圾分类宣传', duration: 45 },
    { id: '5', date: '2026-03-01', volunteerId: 'v-2', type: '河道清洁', duration: 60 },
    { id: '6', date: '2025-12-25', volunteerId: 'v-1', type: '植树', duration: 180 },
  ];

  it('should return 12 months of data', () => {
    const result = computeMonthlyStats(mockActivities, 2026);
    expect(result.length).toBe(12);
    expect(result[0].month).toBe(1);
    expect(result[11].month).toBe(12);
  });

  it('should correctly count activities and duration by month', () => {
    const result = computeMonthlyStats(mockActivities, 2026);
    
    expect(result[0].count).toBe(2);
    expect(result[0].duration).toBe(150);
    
    expect(result[1].count).toBe(2);
    expect(result[1].duration).toBe(165);
    
    expect(result[2].count).toBe(1);
    expect(result[2].duration).toBe(60);
  });

  it('should filter activities by year', () => {
    const result = computeMonthlyStats(mockActivities, 2026);
    expect(result[11].count).toBe(0);
    expect(result[11].duration).toBe(0);
  });

  it('should return zero for months with no activities', () => {
    const result = computeMonthlyStats(mockActivities, 2026);
    for (let i = 3; i < 12; i++) {
      expect(result[i].count).toBe(0);
      expect(result[i].duration).toBe(0);
    }
  });

  it('should handle empty activities array', () => {
    const result = computeMonthlyStats([], 2026);
    expect(result.length).toBe(12);
    result.forEach(month => {
      expect(month.count).toBe(0);
      expect(month.duration).toBe(0);
    });
  });

  it('should handle activities across all 12 months', () => {
    const activities: Activity[] = [];
    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, '0');
      activities.push({
        id: `m${month}`,
        date: `2026-${monthStr}-15`,
        volunteerId: 'v-1',
        type: '垃圾分类宣传',
        duration: month * 10
      });
    }
    const result = computeMonthlyStats(activities, 2026);
    for (let i = 0; i < 12; i++) {
      expect(result[i].count).toBe(1);
      expect(result[i].duration).toBe((i + 1) * 10);
    }
  });
});

describe('computeLeaderboard', () => {
  const mockVolunteers: Volunteer[] = [
    { id: 'v-1', name: '张三', avatar: '张' },
    { id: 'v-2', name: '李四', avatar: '李' },
    { id: 'v-3', name: '王五', avatar: '王' },
    { id: 'v-4', name: '赵六', avatar: '赵' },
  ];

  const mockActivities: Activity[] = [
    { id: '1', date: '2026-01-15', volunteerId: 'v-1', type: '垃圾分类宣传', duration: 120 },
    { id: '2', date: '2026-01-20', volunteerId: 'v-2', type: '河道清洁', duration: 90 },
    { id: '3', date: '2026-02-10', volunteerId: 'v-1', type: '植树', duration: 60 },
    { id: '4', date: '2026-02-15', volunteerId: 'v-3', type: '垃圾分类宣传', duration: 180 },
    { id: '5', date: '2026-03-01', volunteerId: 'v-2', type: '河道清洁', duration: 120 },
    { id: '6', date: '2026-03-10', volunteerId: 'v-1', type: '植树', duration: 90 },
  ];

  it('should rank volunteers by total duration descending', () => {
    const result = computeLeaderboard(mockActivities, mockVolunteers);
    
    expect(result[0].volunteerId).toBe('v-1');
    expect(result[0].totalDuration).toBe(270);
    expect(result[0].rank).toBe(1);
    
    expect(result[1].volunteerId).toBe('v-2');
    expect(result[1].totalDuration).toBe(210);
    expect(result[1].rank).toBe(2);
    
    expect(result[2].volunteerId).toBe('v-3');
    expect(result[2].totalDuration).toBe(180);
    expect(result[2].rank).toBe(3);
  });

  it('should exclude volunteers with no activities', () => {
    const result = computeLeaderboard(mockActivities, mockVolunteers);
    const volunteerIds = result.map(r => r.volunteerId);
    expect(volunteerIds).not.toContain('v-4');
    expect(result.length).toBe(3);
  });

  it('should return at most top 10 volunteers', () => {
    const manyVolunteers: Volunteer[] = [];
    const manyActivities: Activity[] = [];
    
    for (let i = 1; i <= 15; i++) {
      manyVolunteers.push({ id: `v-${i}`, name: `志愿者${i}`, avatar: `${i}` });
      manyActivities.push({
        id: `a-${i}`,
        date: '2026-01-15',
        volunteerId: `v-${i}`,
        type: '垃圾分类宣传',
        duration: i * 10
      });
    }
    
    const result = computeLeaderboard(manyActivities, manyVolunteers);
    expect(result.length).toBe(10);
    expect(result[0].rank).toBe(1);
    expect(result[9].rank).toBe(10);
  });

  it('should return empty array when no activities', () => {
    const result = computeLeaderboard([], mockVolunteers);
    expect(result.length).toBe(0);
  });

  it('should include correct volunteer info', () => {
    const result = computeLeaderboard(mockActivities, mockVolunteers);
    const topVolunteer = result.find(r => r.volunteerId === 'v-1');
    expect(topVolunteer?.name).toBe('张三');
    expect(topVolunteer?.avatar).toBe('张');
  });

  it('should handle ties by preserving order', () => {
    const tiedActivities: Activity[] = [
      { id: '1', date: '2026-01-15', volunteerId: 'v-1', type: '垃圾分类宣传', duration: 100 },
      { id: '2', date: '2026-01-20', volunteerId: 'v-2', type: '河道清洁', duration: 100 },
      { id: '3', date: '2026-02-10', volunteerId: 'v-3', type: '植树', duration: 100 },
    ];
    const result = computeLeaderboard(tiedActivities, mockVolunteers);
    expect(result.length).toBe(3);
    result.forEach(item => {
      expect(item.totalDuration).toBe(100);
    });
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
    expect(result[2].rank).toBe(3);
  });
});

describe('Integration: full data flow test', () => {
  it('should compute stats correctly for complex scenario', () => {
    const volunteers: Volunteer[] = [
      { id: 'v1', name: 'A', avatar: 'A' },
      { id: 'v2', name: 'B', avatar: 'B' },
    ];

    const activities: Activity[] = [];
    for (let month = 1; month <= 6; month++) {
      for (let day = 1; day <= 3; day++) {
        activities.push({
          id: `${month}-${day}`,
          date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          volunteerId: day % 2 === 0 ? 'v1' : 'v2',
          type: day % 3 === 0 ? '植树' : day % 2 === 0 ? '河道清洁' : '垃圾分类宣传',
          duration: 30 + month * 10 + day
        });
      }
    }

    const monthlyStats = computeMonthlyStats(activities, 2026);
    const leaderboard = computeLeaderboard(activities, volunteers);

    for (let i = 0; i < 6; i++) {
      expect(monthlyStats[i].count).toBe(3);
    }
    for (let i = 6; i < 12; i++) {
      expect(monthlyStats[i].count).toBe(0);
    }

    expect(leaderboard.length).toBe(2);
    expect(leaderboard[0].totalDuration).toBeGreaterThan(0);
    expect(leaderboard[1].totalDuration).toBeGreaterThan(0);
    expect(leaderboard[0].totalDuration).not.toEqual(leaderboard[1].totalDuration);
  });
});
