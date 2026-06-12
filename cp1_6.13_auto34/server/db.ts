import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data');

export interface CourseType {
  _id?: string;
  name: string;
  color: string;
  duration: number;
}

export interface Coach {
  _id?: string;
  name: string;
  phone: string;
}

export interface Member {
  _id?: string;
  name: string;
  phone: string;
}

export interface Course {
  _id?: string;
  date: string;
  startTime: string;
  endTime: string;
  courseTypeId: string;
  coachId: string;
  capacity: number;
  bookedCount: number;
  status: 'active' | 'cancelled';
  cancelReason?: string;
}

export interface Booking {
  _id?: string;
  courseId: string;
  memberId: string;
  memberName: string;
  createdAt: string;
  status: 'booked' | 'cancelled';
}

export interface Notification {
  _id?: string;
  courseId: string;
  courseName: string;
  originalTime: string;
  reason: string;
  memberIds: string[];
  readMemberIds: string[];
  createdAt: string;
}

const courseTypes = Datastore.create(path.join(dbPath, 'courseTypes.db'));
const coaches = Datastore.create(path.join(dbPath, 'coaches.db'));
const members = Datastore.create(path.join(dbPath, 'members.db'));
const courses = Datastore.create(path.join(dbPath, 'courses.db'));
const bookings = Datastore.create(path.join(dbPath, 'bookings.db'));
const notifications = Datastore.create(path.join(dbPath, 'notifications.db'));

async function initMockData() {
  const ctCount = await courseTypes.count({});
  if (ctCount === 0) {
    await courseTypes.insertMany([
      { _id: uuidv4(), name: '瑜伽', color: '#e9d5ff', duration: 60 },
      { _id: uuidv4(), name: '力量训练', color: '#fed7aa', duration: 60 },
      { _id: uuidv4(), name: '动感单车', color: '#fecaca', duration: 45 },
      { _id: uuidv4(), name: '普拉提', color: '#bfdbfe', duration: 60 }
    ]);
  }

  const coachCount = await coaches.count({});
  if (coachCount === 0) {
    await coaches.insertMany([
      { _id: uuidv4(), name: '李教练', phone: '13800000001' },
      { _id: uuidv4(), name: '王教练', phone: '13800000002' },
      { _id: uuidv4(), name: '张教练', phone: '13800000003' }
    ]);
  }

  const memberCount = await members.count({});
  if (memberCount === 0) {
    await members.insertMany([
      { _id: uuidv4(), name: '会员小明', phone: '13900000001' },
      { _id: uuidv4(), name: '会员小红', phone: '13900000002' },
      { _id: uuidv4(), name: '会员小刚', phone: '13900000003' }
    ]);
  }

  const courseCount = await courses.count({});
  if (courseCount === 0) {
    const allCourseTypes = await courseTypes.find({});
    const allCoaches = await coaches.find({});
    const today = new Date();
    const mockCourses: Partial<Course>[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      const timeSlots = [
        { start: '09:00', end: '10:00' },
        { start: '10:30', end: '11:30' },
        { start: '14:00', end: '15:00' },
        { start: '16:00', end: '16:45' },
        { start: '19:00', end: '20:00' }
      ];

      timeSlots.forEach((slot, idx) => {
        const ct = allCourseTypes[(i + idx) % allCourseTypes.length];
        const coach = allCoaches[(i + idx) % allCoaches.length];
        mockCourses.push({
          _id: uuidv4(),
          date: dateStr,
          startTime: slot.start,
          endTime: slot.end,
          courseTypeId: ct._id!,
          coachId: coach._id!,
          capacity: 12 + (idx % 3) * 3,
          bookedCount: Math.floor(Math.random() * 10),
          status: 'active'
        });
      });
    }
    await courses.insertMany(mockCourses as Course[]);
  }
}

export const db = {
  courseTypes,
  coaches,
  members,
  courses,
  bookings,
  notifications,
  initMockData
};
