import type { Task, MemberWorkload, WorkloadSummary } from '@/types';
import { OVERLOAD_THRESHOLD, MEMBER_CAPACITY, TEAM_MEMBERS } from '@/types';

export function calculateWorkload(tasks: Task[]): WorkloadSummary {
  const allMemberNames = new Set<string>(TEAM_MEMBERS);
  for (const task of tasks) {
    allMemberNames.add(task.assignee);
  }
  const sortedMemberNames = Array.from(allMemberNames).sort();

  const memberMap = new Map<string, Task[]>();
  for (const member of sortedMemberNames) {
    memberMap.set(member, []);
  }
  for (const task of tasks) {
    if (!memberMap.has(task.assignee)) {
      memberMap.set(task.assignee, []);
    }
    memberMap.get(task.assignee)!.push(task);
  }

  const members: MemberWorkload[] = sortedMemberNames.map((name) => {
    const memberTasks = memberMap.get(name) || [];
    const taskCount = memberTasks.length;
    const totalHours = memberTasks.reduce((sum, t) => sum + t.estimateHours, 0);
    const remainingCapacity = Math.max(0, MEMBER_CAPACITY - taskCount);
    const isOverloaded = taskCount > OVERLOAD_THRESHOLD;

    return {
      name,
      taskCount,
      totalHours,
      capacity: MEMBER_CAPACITY,
      remainingCapacity,
      isOverloaded,
      tasks: memberTasks,
    };
  });

  const overloadedCount = members.filter((m) => m.isOverloaded).length;

  return {
    totalTasks: tasks.length,
    overloadedCount,
    members,
  };
}

export function getOverloadedMembers(summary: WorkloadSummary): MemberWorkload[] {
  return summary.members.filter((m) => m.isOverloaded);
}

export function getMemberByName(
  summary: WorkloadSummary,
  name: string
): MemberWorkload | undefined {
  return summary.members.find((m) => m.name === name);
}
