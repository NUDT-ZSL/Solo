export interface Member {
  id: string;
  name: string;
  avatarUrl: string;
  streakDays: number;
  weeklyMinutes: number;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  members: Member[];
  weeklyTargetMinutes: number;
}

export interface CheckInRecord {
  memberId: string;
  memberName: string;
  duration: number;
  timestamp: number;
  groupId: string;
}

type UpdateCallback = (records: CheckInRecord[]) => void;

const avatarColors = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#6366f1'
];

const memberNames = [
  '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
  '郑小明', '王小红', '李华', '陈静', '刘洋', '杨帆', '黄磊', '周婷',
  '吴昊', '徐峰', '孙丽', '马超', '朱琳', '胡军', '郭静', '何伟'
];

const groupNames = [
  { name: '考研冲刺营', desc: '一起备战研究生考试，每日打卡互相监督' },
  { name: 'Python学习小组', desc: '从零开始学习Python编程，共同进步' },
  { name: '英语六级备考', desc: '冲刺六级，每天背单词做阅读' },
  { name: '前端进阶训练营', desc: '深入学习React、Vue等前端框架' },
  { name: '公务员考试团', desc: '行测申论全面复习，一起上岸' }
];

function generateAvatar(name: string, index: number): string {
  const color = avatarColors[index % avatarColors.length];
  const initial = String.fromCharCode(65 + (index % 26));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${color}" rx="50"/>
    <text x="50" y="50" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function generateMembers(count: number, startIndex: number): Member[] {
  const members: Member[] = [];
  for (let i = 0; i < count; i++) {
    const nameIndex = (startIndex + i) % memberNames.length;
    const name = memberNames[nameIndex];
    members.push({
      id: `member-${startIndex + i}`,
      name,
      avatarUrl: generateAvatar(name, startIndex + i),
      streakDays: Math.floor(Math.random() * 30) + 1,
      weeklyMinutes: Math.floor(Math.random() * 1200) + 300
    });
  }
  return members;
}

function generateGroups(): StudyGroup[] {
  const groups: StudyGroup[] = [];
  let memberIndex = 0;
  
  for (let i = 0; i < 5; i++) {
    const memberCount = Math.floor(Math.random() * 3) + 6;
    const groupInfo = groupNames[i];
    groups.push({
      id: `group-${i + 1}`,
      name: groupInfo.name,
      description: groupInfo.desc,
      members: generateMembers(memberCount, memberIndex),
      weeklyTargetMinutes: memberCount * 600
    });
    memberIndex += memberCount;
  }
  
  return groups;
}

const groups = generateGroups();

export function getGroups(): StudyGroup[] {
  return groups.map(g => ({
    ...g,
    members: g.members.map(m => ({ ...m }))
  }));
}

export function getGroupById(id: string): StudyGroup | undefined {
  const group = groups.find(g => g.id === id);
  if (!group) return undefined;
  return {
    ...group,
    members: group.members.map(m => ({ ...m }))
  };
}

class MockEventBus {
  private subscribers: Set<UpdateCallback> = new Set();
  private intervalId: number | null = null;

  subscribe(callback: UpdateCallback): () => void {
    this.subscribers.add(callback);
    if (!this.intervalId) {
      this.startPublishing();
    }
    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0 && this.intervalId) {
        this.stopPublishing();
      }
    };
  }

  private startPublishing(): void {
    this.intervalId = window.setInterval(() => {
      const records = this.generateRandomCheckIns();
      this.publish(records);
    }, 5000);
  }

  private stopPublishing(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private generateRandomCheckIns(): CheckInRecord[] {
    const records: CheckInRecord[] = [];
    const recordCount = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < recordCount; i++) {
      const groupIndex = Math.floor(Math.random() * groups.length);
      const group = groups[groupIndex];
      const memberIndex = Math.floor(Math.random() * group.members.length);
      const member = group.members[memberIndex];
      const duration = Math.floor(Math.random() * 90) + 15;
      
      member.weeklyMinutes += duration;
      
      records.push({
        memberId: member.id,
        memberName: member.name,
        duration,
        timestamp: Date.now(),
        groupId: group.id
      });
    }
    
    return records;
  }

  private publish(records: CheckInRecord[]): void {
    this.subscribers.forEach(callback => {
      try {
        callback(records);
      } catch (e) {
        console.error('Subscriber error:', e);
      }
    });
  }
}

const eventBus = new MockEventBus();

export function subscribeToUpdates(callback: UpdateCallback): () => void {
  return eventBus.subscribe(callback);
}
