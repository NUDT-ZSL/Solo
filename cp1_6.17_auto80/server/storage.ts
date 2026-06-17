import { v4 as uuidv4 } from 'uuid';

export interface EventItem {
  id: string;
  name: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  type: 'rehearsal' | 'performance';
  participants: string[];
  deviceIds: string[];
}

export interface Device {
  id: string;
  name: string;
  owner: string;
  price: number;
  status: 'available' | 'borrowed' | 'maintenance';
}

export interface BorrowRequest {
  id: string;
  deviceId: string;
  borrower: string;
  startDate: string;
  endDate: string;
  approved: boolean;
  returned: boolean;
}

const events: EventItem[] = [];
const devices: Device[] = [];
const borrowRequests: BorrowRequest[] = [];

function seedData() {
  const members = ['小明', '小红', '阿杰', '大伟', '小芳'];
  const cities = ['北京', '上海', '广州', '深圳', '成都', '杭州', '武汉', '南京'];
  const venues = ['星光Livehouse', 'MAO Livehouse', '愚公移山', '豪运酒吧', '小酒馆', 'VOX', '46Livehouse', 'New Noise'];
  const deviceNames = ['Fender Stratocaster', 'Gibson Les Paul', 'Rickenbacker 4003', 'Roland TD-50', 'Shure SM58', 'Yamaha P45', 'Marshall JCM900', 'Korg Minilogue', 'AKG C414', 'Boss RC-505', 'Fender Jazz Bass', 'DW Drum Kit', 'Neumann U87', 'Fender Twin Reverb', 'Ampeg SVT', 'Mesa Boogie Dual Rectifier', 'Roland Juno-106', 'Taylor 814ce', 'Pearl Export', 'Yamaha Recording Custom'];

  const now = new Date();
  for (let i = 0; i < 20; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Math.floor(Math.random() * 30) - 10);
    events.push({
      id: uuidv4(),
      name: i % 3 === 0 ? `排练 #${i + 1}` : `${cities[i % 8]}专场演出`,
      city: cities[i % 8],
      venue: venues[i % 8],
      date: date.toISOString().split('T')[0],
      time: i % 3 === 0 ? '14:00' : '20:00',
      type: i % 3 === 0 ? 'rehearsal' : 'performance',
      participants: members.slice(0, 2 + Math.floor(Math.random() * 4)),
      deviceIds: [],
    });
  }

  for (let i = 0; i < 20; i++) {
    devices.push({
      id: uuidv4(),
      name: deviceNames[i],
      owner: members[i % 5],
      price: Math.round((500 + Math.random() * 9500) * 100) / 100,
      status: i % 5 === 0 ? 'borrowed' : i % 7 === 0 ? 'maintenance' : 'available',
    });
  }

  for (let i = 0; i < 5; i++) {
    const d = devices.filter(d => d.status === 'borrowed');
    if (d[i]) {
      const startDate = new Date(now.getTime() - 3 * 86400000);
      const endDate = i < 2 
        ? new Date(now.getTime() + (0.1 + Math.random() * 0.8) * 86400000)
        : new Date(now.getTime() + (1 + Math.random() * 5) * 86400000);
      borrowRequests.push({
        id: uuidv4(),
        deviceId: d[i].id,
        borrower: members[(i + 2) % 5],
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        approved: true,
        returned: false,
      });
    }
  }
}

seedData();

export function getAllEvents(): EventItem[] {
  return events;
}

export function getEventById(id: string): EventItem | undefined {
  return events.find(e => e.id === id);
}

export function createEvent(data: Omit<EventItem, 'id'>): EventItem {
  const item: EventItem = { ...data, id: uuidv4() };
  events.push(item);
  return item;
}

export function updateEvent(id: string, data: Partial<EventItem>): EventItem | null {
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) return null;
  events[idx] = { ...events[idx], ...data };
  return events[idx];
}

export function deleteEvent(id: string): boolean {
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) return false;
  events.splice(idx, 1);
  return true;
}

export function getAllDevices(): Device[] {
  return devices;
}

export function getDeviceById(id: string): Device | undefined {
  return devices.find(d => d.id === id);
}

export function createDevice(data: Omit<Device, 'id'>): Device {
  const item: Device = { ...data, id: uuidv4() };
  devices.push(item);
  return item;
}

export function updateDevice(id: string, data: Partial<Device>): Device | null {
  const idx = devices.findIndex(d => d.id === id);
  if (idx === -1) return null;
  devices[idx] = { ...devices[idx], ...data };
  return devices[idx];
}

export function deleteDevice(id: string): boolean {
  const idx = devices.findIndex(d => d.id === id);
  if (idx === -1) return false;
  devices.splice(idx, 1);
  return true;
}

export function getAllBorrowRequests(): BorrowRequest[] {
  return borrowRequests;
}

export function createBorrowRequest(data: Omit<BorrowRequest, 'id' | 'approved' | 'returned'>): BorrowRequest {
  const item: BorrowRequest = { ...data, id: uuidv4(), approved: false, returned: false };
  borrowRequests.push(item);
  return item;
}

export function approveBorrowRequest(id: string): BorrowRequest | null {
  const req = borrowRequests.find(r => r.id === id);
  if (!req) return null;
  req.approved = true;
  const dev = devices.find(d => d.id === req.deviceId);
  if (dev) dev.status = 'borrowed';
  return req;
}

export function returnBorrowRequest(id: string): BorrowRequest | null {
  const req = borrowRequests.find(r => r.id === id);
  if (!req) return null;
  req.returned = true;
  const dev = devices.find(d => d.id === req.deviceId);
  if (dev) dev.status = 'available';
  return req;
}

export function getBorrowRequestsByBorrower(borrower: string): BorrowRequest[] {
  return borrowRequests.filter(r => r.borrower === borrower);
}
