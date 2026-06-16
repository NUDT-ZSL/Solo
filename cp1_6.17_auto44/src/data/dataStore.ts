export type PreferenceType = 'food' | 'history' | 'nature';

export interface BudgetBreakdown {
  transport: number;
  accommodation: number;
  food: number;
  other: number;
}

export interface DailyPlan {
  day: number;
  title: string;
  spots: string[];
  completed?: boolean;
}

export interface Route {
  id: string;
  city: string;
  days: number;
  totalBudget: number;
  budget: BudgetBreakdown;
  dailyPlans: DailyPlan[];
}

export interface Applicant {
  userId: string;
  nickname: string;
  avatar: string;
  preference: PreferenceType;
  appliedAt: number;
}

export interface MatchingGroup {
  routeId: string;
  members: Applicant[];
  matched: boolean;
  matchedAt?: number;
}

export interface Notification {
  id: string;
  routeId: string;
  routeName: string;
  memberCount: number;
  createdAt: number;
}

type Listener = () => void;

const ANIMAL_EMOJIS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐮'];

const ROUTES_DATA: Route[] = [
  {
    id: 'route-001',
    city: '成都',
    days: 5,
    totalBudget: 4200,
    budget: { transport: 1260, accommodation: 1680, food: 840, other: 420 },
    dailyPlans: [
      { day: 1, title: '抵达成都·宽窄巷子初探', spots: ['双流机场', '宽窄巷子', '锦里古街'], completed: false },
      { day: 2, title: '熊猫基地·春熙路商圈', spots: ['大熊猫繁育研究基地', '春熙路', 'IFS爬墙熊猫'], completed: false },
      { day: 3, title: '都江堰·青城山', spots: ['都江堰景区', '青城山', '南桥夜景'], completed: false },
      { day: 4, title: '武侯祠·杜甫草堂', spots: ['武侯祠', '杜甫草堂', '青羊宫'], completed: false },
      { day: 5, title: '美食扫街·返程', spots: ['建设路小吃街', '人民公园', '双流机场'], completed: false },
    ],
  },
  {
    id: 'route-002',
    city: '丽江',
    days: 6,
    totalBudget: 5500,
    budget: { transport: 1650, accommodation: 2200, food: 1100, other: 550 },
    dailyPlans: [
      { day: 1, title: '抵达丽江·古城夜游', spots: ['三义机场', '丽江古城', '四方街'], completed: false },
      { day: 2, title: '玉龙雪山一日游', spots: ['玉龙雪山', '蓝月谷', '甘海子'], completed: false },
      { day: 3, title: '束河古镇·白沙古镇', spots: ['束河古镇', '白沙古镇', '玉水寨'], completed: false },
      { day: 4, title: '泸沽湖环湖', spots: ['泸沽湖', '里格半岛', '走婚桥'], completed: false },
      { day: 5, title: '虎跳峡·香格里拉', spots: ['虎跳峡', '独克宗古城', '普达措'], completed: false },
      { day: 6, title: '返程', spots: ['丽江古城', '三义机场'], completed: false },
    ],
  },
  {
    id: 'route-003',
    city: '厦门',
    days: 4,
    totalBudget: 3200,
    budget: { transport: 960, accommodation: 1280, food: 640, other: 320 },
    dailyPlans: [
      { day: 1, title: '鼓浪屿一日游', spots: ['鼓浪屿', '日光岩', '菽庄花园'], completed: false },
      { day: 2, title: '厦门大学·南普陀', spots: ['厦门大学', '南普陀寺', '白城沙滩'], completed: false },
      { day: 3, title: '曾厝垵·环岛路', spots: ['曾厝垵', '环岛路骑行', '胡里山炮台'], completed: false },
      { day: 4, title: '沙坡尾·返程', spots: ['沙坡尾', '中山路', '高崎机场'], completed: false },
    ],
  },
  {
    id: 'route-004',
    city: '西安',
    days: 5,
    totalBudget: 3800,
    budget: { transport: 1140, accommodation: 1520, food: 760, other: 380 },
    dailyPlans: [
      { day: 1, title: '抵达西安·城墙夜游', spots: ['咸阳机场', '西安城墙', '回民街'], completed: false },
      { day: 2, title: '兵马俑·华清池', spots: ['秦始皇兵马俑', '华清宫', '骊山'], completed: false },
      { day: 3, title: '大雁塔·大唐不夜城', spots: ['大雁塔', '陕西历史博物馆', '大唐不夜城'], completed: false },
      { day: 4, title: '华山一日游', spots: ['华山', '西峰', '南峰'], completed: false },
      { day: 5, title: '钟鼓楼·返程', spots: ['钟楼', '鼓楼', '咸阳机场'], completed: false },
    ],
  },
  {
    id: 'route-005',
    city: '杭州',
    days: 4,
    totalBudget: 3500,
    budget: { transport: 1050, accommodation: 1400, food: 700, other: 350 },
    dailyPlans: [
      { day: 1, title: '西湖一日游', spots: ['断桥残雪', '苏堤', '雷峰塔'], completed: false },
      { day: 2, title: '灵隐寺·西溪湿地', spots: ['灵隐寺', '飞来峰', '西溪湿地'], completed: false },
      { day: 3, title: '宋城·河坊街', spots: ['宋城', '河坊街', '南宋御街'], completed: false },
      { day: 4, title: '千岛湖·返程', spots: ['千岛湖', '萧山机场'], completed: false },
    ],
  },
  {
    id: 'route-006',
    city: '重庆',
    days: 4,
    totalBudget: 3000,
    budget: { transport: 900, accommodation: 1200, food: 600, other: 300 },
    dailyPlans: [
      { day: 1, title: '洪崖洞·解放碑', spots: ['江北机场', '洪崖洞', '解放碑'], completed: false },
      { day: 2, title: '磁器口·长江索道', spots: ['磁器口古镇', '长江索道', '南山一棵树'], completed: false },
      { day: 3, title: '武隆天坑', spots: ['武隆天生三桥', '龙水峡地缝'], completed: false },
      { day: 4, title: '李子坝·返程', spots: ['李子坝轻轨', '鹅岭二厂', '江北机场'], completed: false },
    ],
  },
];

const PREFERENCE_LABELS: Record<PreferenceType, string> = {
  food: '当地美食',
  history: '历史遗迹',
  nature: '自然风光',
};

class DataStore {
  private routes: Route[];
  private applications: Map<string, Applicant[]>;
  private matchedGroups: Map<string, MatchingGroup>;
  private notifications: Notification[];
  private listeners: Set<Listener>;
  private userApplications: Map<string, { routeId: string; preference: PreferenceType }[]>;
  private currentUserId: string;

  constructor() {
    this.routes = [...ROUTES_DATA];
    this.applications = new Map();
    this.matchedGroups = new Map();
    this.notifications = [];
    this.listeners = new Set();
    this.userApplications = new Map();
    this.currentUserId = 'user-' + Math.random().toString(36).slice(2, 8);
    this.routes.forEach((r) => {
      this.applications.set(r.id, []);
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }

  getRoutes(): Route[] {
    return this.routes;
  }

  getRouteById(id: string): Route | undefined {
    return this.routes.find((r) => r.id === id);
  }

  getPreferenceLabel(p: PreferenceType): string {
    return PREFERENCE_LABELS[p];
  }

  searchRoutes(keyword?: string, maxBudget?: number, minDays?: number, maxDays?: number): Route[] {
    return this.routes.filter((r) => {
      if (keyword && !r.city.includes(keyword)) return false;
      if (maxBudget !== undefined && r.totalBudget > maxBudget) return false;
      if (minDays !== undefined && r.days < minDays) return false;
      if (maxDays !== undefined && r.days > maxDays) return false;
      return true;
    }).slice(0, 3);
  }

  private getRandomAvatar(): string {
    return ANIMAL_EMOJIS[Math.floor(Math.random() * ANIMAL_EMOJIS.length)];
  }

  applyToRoute(userId: string, routeId: string, preference: PreferenceType, nickname?: string): boolean {
    const route = this.getRouteById(routeId);
    if (!route) return false;

    const existingGroup = this.matchedGroups.get(routeId);
    if (existingGroup && existingGroup.matched) return false;

    const applicants = this.applications.get(routeId) || [];
    if (applicants.some((a) => a.userId === userId)) return false;

    const applicant: Applicant = {
      userId,
      nickname: nickname || '旅行者' + userId.slice(-4),
      avatar: this.getRandomAvatar(),
      preference,
      appliedAt: Date.now(),
    };

    applicants.push(applicant);
    this.applications.set(routeId, applicants);

    const userApps = this.userApplications.get(userId) || [];
    userApps.push({ routeId, preference });
    this.userApplications.set(userId, userApps);

    if (applicants.length >= 3 && applicants.length <= 5) {
      const group: MatchingGroup = {
        routeId,
        members: applicants.slice(0, 5),
        matched: true,
        matchedAt: Date.now(),
      };
      this.matchedGroups.set(routeId, group);

      const notification: Notification = {
        id: 'notif-' + Date.now(),
        routeId,
        routeName: route.city + ' ' + route.days + '日游',
        memberCount: group.members.length,
        createdAt: Date.now(),
      };
      this.notifications.push(notification);

      setTimeout(() => this.notify(), 100);
    }

    this.notify();
    return true;
  }

  checkMatchingStatus(routeId: string): { matched: boolean; count: number; group?: MatchingGroup } {
    const group = this.matchedGroups.get(routeId);
    if (group && group.matched) {
      return { matched: true, count: group.members.length, group };
    }
    const applicants = this.applications.get(routeId) || [];
    return { matched: false, count: applicants.length };
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  consumeNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notify();
  }

  getUserApplications(userId: string): { routeId: string; preference: PreferenceType; status: 'matching' | 'matched' }[] {
    const apps = this.userApplications.get(userId) || [];
    return apps.map((a) => {
      const status = this.checkMatchingStatus(a.routeId);
      return {
        routeId: a.routeId,
        preference: a.preference,
        status: status.matched ? 'matched' : 'matching',
      };
    });
  }

  getMatchedGroup(routeId: string): MatchingGroup | undefined {
    return this.matchedGroups.get(routeId);
  }

  hasUserApplied(userId: string, routeId: string): boolean {
    const applicants = this.applications.get(routeId) || [];
    return applicants.some((a) => a.userId === userId);
  }

  assignTaskByPreference(group: MatchingGroup): Record<string, string[]> {
    const route = this.getRouteById(group.routeId);
    if (!route) return {};
    const result: Record<string, string[]> = {};
    const allSpots = route.dailyPlans.flatMap((d) => d.spots);
    group.members.forEach((m) => {
      result[m.userId] = [];
    });
    allSpots.forEach((spot, idx) => {
      const member = group.members[idx % group.members.length];
      result[member.userId].push(spot);
    });
    return result;
  }
}

export const dataStore = new DataStore();

declare global {
  interface Window {
    __tubanDemo?: {
      simulateApply: (routeId: string, count?: number) => void;
      dataStore: typeof dataStore;
    };
  }
}

if (typeof window !== 'undefined') {
  window.__tubanDemo = {
    simulateApply: (routeId: string, count = 1) => {
      for (let i = 0; i < count; i++) {
        const fakeUserId = 'fake-' + Math.random().toString(36).slice(2, 8);
        const prefs: PreferenceType[] = ['food', 'history', 'nature'];
        const nicknames = ['小王', '小李', '小张', '小陈', '小刘', '小杨', '小周', '小吴'];
        dataStore.applyToRoute(
          fakeUserId,
          routeId,
          prefs[Math.floor(Math.random() * prefs.length)],
          nicknames[Math.floor(Math.random() * nicknames.length)]
        );
      }
    },
    dataStore,
  };

  setTimeout(() => {
    window.__tubanDemo!.simulateApply('route-001', 2);
  }, 800);
}

