import { v4 as uuidv4 } from 'uuid';

export interface Member {
  id: string;
  name: string;
  role: string;
  city: string;
  isAdmin: boolean;
}

export interface Event {
  id: string;
  name: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  type: 'rehearsal' | 'performance';
  participantIds: string[];
  deviceIds: string[];
  createdAt: string;
}

export interface Device {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  purchasePrice: number;
  status: 'idle' | 'borrowed' | 'repairing';
  createdAt: string;
}

export interface BorrowRequest {
  id: string;
  deviceId: string;
  deviceName: string;
  borrowerId: string;
  borrowerName: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'borrow_due' | 'request_approved' | 'request_rejected';
  message: string;
  isRead: boolean;
  createdAt: string;
}

const members: Member[] = [
  { id: 'm1', name: '李明', role: '主唱', city: '北京', isAdmin: true },
  { id: 'm2', name: '王芳', role: '吉他手', city: '上海', isAdmin: false },
  { id: 'm3', name: '张伟', role: '贝斯手', city: '广州', isAdmin: false },
  { id: 'm4', name: '刘洋', role: '鼓手', city: '深圳', isAdmin: false },
  { id: 'm5', name: '陈静', role: '键盘手', city: '成都', isAdmin: false },
];

const now = new Date();
const addDays = (days: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const events: Event[] = [
  {
    id: 'e1',
    name: '周末排练',
    city: '北京',
    venue: '星光排练室',
    date: addDays(2),
    time: '14:00',
    type: 'rehearsal',
    participantIds: ['m1', 'm2', 'm3', 'm4'],
    deviceIds: ['d1', 'd2'],
    createdAt: now.toISOString(),
  },
  {
    id: 'e2',
    name: '夏季音乐节',
    city: '上海',
    venue: '梅赛德斯奔驰文化中心',
    date: addDays(10),
    time: '19:30',
    type: 'performance',
    participantIds: ['m1', 'm2', 'm3', 'm4', 'm5'],
    deviceIds: ['d1', 'd2', 'd3', 'd4'],
    createdAt: now.toISOString(),
  },
  {
    id: 'e3',
    name: 'LiveHouse演出',
    city: '广州',
    venue: 'MAO Livehouse',
    date: addDays(20),
    time: '20:00',
    type: 'performance',
    participantIds: ['m1', 'm2', 'm3', 'm4'],
    deviceIds: ['d1', 'd2', 'd3'],
    createdAt: now.toISOString(),
  },
  {
    id: 'e4',
    name: '新歌排练',
    city: '北京',
    venue: '超级音乐排练室',
    date: addDays(5),
    time: '15:00',
    type: 'rehearsal',
    participantIds: ['m1', 'm2', 'm5'],
    deviceIds: ['d2', 'd4'],
    createdAt: now.toISOString(),
  },
  {
    id: 'e5',
    name: '校园巡演',
    city: '成都',
    venue: '川大体育馆',
    date: addDays(30),
    time: '18:00',
    type: 'performance',
    participantIds: ['m1', 'm2', 'm3', 'm4', 'm5'],
    deviceIds: ['d1', 'd2', 'd3', 'd4', 'd5'],
    createdAt: now.toISOString(),
  },
];

const devices: Device[] = [
  { id: 'd1', name: 'Fender 电吉他', ownerId: 'm2', ownerName: '王芳', purchasePrice: 8500, status: 'idle', createdAt: now.toISOString() },
  { id: 'd2', name: 'Yamaha 贝斯', ownerId: 'm3', ownerName: '张伟', purchasePrice: 6200, status: 'borrowed', createdAt: now.toISOString() },
  { id: 'd3', name: 'DW 架子鼓套装', ownerId: 'm4', ownerName: '刘洋', purchasePrice: 15000, status: 'idle', createdAt: now.toISOString() },
  { id: 'd4', name: 'Roland 键盘合成器', ownerId: 'm5', ownerName: '陈静', purchasePrice: 12000, status: 'repairing', createdAt: now.toISOString() },
  { id: 'd5', name: 'Shure SM58 麦克风', ownerId: 'm1', ownerName: '李明', purchasePrice: 1200, status: 'idle', createdAt: now.toISOString() },
  { id: 'd6', name: 'Marshall 吉他音箱', ownerId: 'm2', ownerName: '王芳', purchasePrice: 4500, status: 'idle', createdAt: now.toISOString() },
  { id: 'd7', name: 'Ampeg 贝斯音箱', ownerId: 'm3', ownerName: '张伟', purchasePrice: 5800, status: 'idle', createdAt: now.toISOString() },
  { id: 'd8', name: 'Zildjian 镲片套装', ownerId: 'm4', ownerName: '刘洋', purchasePrice: 3200, status: 'idle', createdAt: now.toISOString() },
  { id: 'd9', name: 'Audio-Technica 监听耳机', ownerId: 'm1', ownerName: '李明', purchasePrice: 1800, status: 'idle', createdAt: now.toISOString() },
  { id: 'd10', name: 'Boss 效果器板', ownerId: 'm2', ownerName: '王芳', purchasePrice: 2800, status: 'idle', createdAt: now.toISOString() },
  { id: 'd11', name: 'Line 6 效果器', ownerId: 'm3', ownerName: '张伟', purchasePrice: 2200, status: 'idle', createdAt: now.toISOString() },
  { id: 'd12', name: 'Sennheiser 无线话筒', ownerId: 'm1', ownerName: '李明', purchasePrice: 3500, status: 'idle', createdAt: now.toISOString() },
];

const borrowRequests: BorrowRequest[] = [
  {
    id: 'b1',
    deviceId: 'd2',
    deviceName: 'Yamaha 贝斯',
    borrowerId: 'm1',
    borrowerName: '李明',
    startDate: addDays(0),
    endDate: addDays(3),
    status: 'approved',
    createdAt: now.toISOString(),
  },
  {
    id: 'b2',
    deviceId: 'd1',
    deviceName: 'Fender 电吉他',
    borrowerId: 'm5',
    borrowerName: '陈静',
    startDate: addDays(5),
    endDate: addDays(8),
    status: 'pending',
    createdAt: now.toISOString(),
  },
];

const notifications: Notification[] = [];

export const storage = {
  members,
  events,
  devices,
  borrowRequests,
  notifications,
  currentUserId: 'm1',
};

export const getMembers = (): Member[] => [...storage.members];
export const getMember = (id: string): Member | undefined => storage.members.find((m) => m.id === id);
export const getCurrentUser = (): Member | undefined => getMember(storage.currentUserId);
export const setCurrentUser = (id: string): void => {
  storage.currentUserId = id;
};

export const getEvents = (): Event[] => [...storage.events];
export const getEvent = (id: string): Event | undefined => storage.events.find((e) => e.id === id);
export const createEvent = (data: Omit<Event, 'id' | 'createdAt'>): Event => {
  const event: Event = {
    ...data,
    id: 'e' + uuidv4().slice(0, 8),
    createdAt: new Date().toISOString(),
  };
  storage.events.push(event);
  return event;
};
export const updateEvent = (id: string, data: Partial<Event>): Event | undefined => {
  const index = storage.events.findIndex((e) => e.id === id);
  if (index === -1) return undefined;
  storage.events[index] = { ...storage.events[index], ...data };
  return storage.events[index];
};
export const deleteEvent = (id: string): boolean => {
  const index = storage.events.findIndex((e) => e.id === id);
  if (index === -1) return false;
  storage.events.splice(index, 1);
  return true;
};

export const getDevices = (): Device[] => [...storage.devices];
export const getDevice = (id: string): Device | undefined => storage.devices.find((d) => d.id === id);
export const createDevice = (data: Omit<Device, 'id' | 'createdAt' | 'status'>): Device => {
  const device: Device = {
    ...data,
    status: 'idle',
    id: 'd' + uuidv4().slice(0, 8),
    createdAt: new Date().toISOString(),
  };
  storage.devices.push(device);
  return device;
};
export const updateDevice = (id: string, data: Partial<Device>): Device | undefined => {
  const index = storage.devices.findIndex((d) => d.id === id);
  if (index === -1) return undefined;
  storage.devices[index] = { ...storage.devices[index], ...data };
  return storage.devices[index];
};
export const deleteDevice = (id: string): boolean => {
  const index = storage.devices.findIndex((d) => d.id === id);
  if (index === -1) return false;
  storage.devices.splice(index, 1);
  return true;
};

export const getBorrowRequests = (): BorrowRequest[] => [...storage.borrowRequests];
export const getBorrowRequest = (id: string): BorrowRequest | undefined =>
  storage.borrowRequests.find((b) => b.id === id);
export const createBorrowRequest = (
  data: Omit<BorrowRequest, 'id' | 'createdAt' | 'status'>
): BorrowRequest => {
  const request: BorrowRequest = {
    ...data,
    status: 'pending',
    id: 'b' + uuidv4().slice(0, 8),
    createdAt: new Date().toISOString(),
  };
  storage.borrowRequests.push(request);
  return request;
};
export const updateBorrowRequest = (
  id: string,
  data: Partial<BorrowRequest>
): BorrowRequest | undefined => {
  const index = storage.borrowRequests.findIndex((b) => b.id === id);
  if (index === -1) return undefined;
  storage.borrowRequests[index] = { ...storage.borrowRequests[index], ...data };
  return storage.borrowRequests[index];
};

export const getNotifications = (userId: string): Notification[] =>
  storage.notifications.filter((n) => n.userId === userId);
export const createNotification = (data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Notification => {
  const notification: Notification = {
    ...data,
    isRead: false,
    id: 'n' + uuidv4().slice(0, 8),
    createdAt: new Date().toISOString(),
  };
  storage.notifications.push(notification);
  return notification;
};
export const markNotificationRead = (id: string): boolean => {
  const notification = storage.notifications.find((n) => n.id === id);
  if (!notification) return false;
  notification.isRead = true;
  return true;
};

export const checkBorrowDueDates = (): void => {
  const now = new Date();
  const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  storage.borrowRequests
    .filter((br) => br.status === 'approved')
    .forEach((br) => {
      const endDate = new Date(br.endDate);
      if (endDate <= twentyFourHoursLater && endDate > now) {
        const existingNotif = storage.notifications.find(
          (n) => n.userId === br.borrowerId && n.message.includes(br.deviceName) && !n.isRead
        );
        if (!existingNotif) {
          createNotification({
            userId: br.borrowerId,
            type: 'borrow_due',
            message: `设备「${br.deviceName}」将在24小时内到期，请及时归还`,
          });
        }
      }
    });
};
