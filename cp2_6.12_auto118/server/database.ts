import { v4 as uuidv4 } from 'uuid';

export interface Work {
  id: string;
  name: string;
  description: string;
  price: number;
  category: '钱包' | '皮带' | '背包' | '小物';
  image: string;
  stock: number;
  created_at: string;
}

export interface Order {
  id: string;
  customer_name: string;
  phone: string;
  items: string;
  total_price: number;
  status: 'pending' | 'paid' | 'shipped' | 'completed';
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number;
  image: string;
}

export interface CourseSlot {
  id: string;
  course_id: string;
  date: string;
  time: string;
  max_capacity: number;
  booked_count: number;
}

export interface Booking {
  id: string;
  slot_id: string;
  course_id: string;
  customer_name: string;
  phone: string;
  status: 'booked' | 'cancelled';
  created_at: string;
}

const works: Work[] = [];
const orders: Order[] = [];
const courses: Course[] = [];
const courseSlots: CourseSlot[] = [];
const bookings: Booking[] = [];

export const initializeDatabase = async () => {
  if (works.length === 0) {
    const seedWorks: Omit<Work, 'created_at'>[] = [
      { id: 'w1', name: '复古皮革钱包', description: '头层牛皮手工缝制，多卡位设计', price: 298, category: '钱包', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', stock: 15 },
      { id: 'w2', name: '经典长款钱夹', description: '意大利植鞣皮，复古做旧风格', price: 388, category: '钱包', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', stock: 12 },
      { id: 'w3', name: '商务真皮皮带', description: '头层牛皮自动扣，可调节长度', price: 258, category: '皮带', image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400', stock: 20 },
      { id: 'w4', name: '复古针扣皮带', description: '黄铜扣头，疯马皮材质', price: 198, category: '皮带', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', stock: 18 },
      { id: 'w5', name: '手工双肩背包', description: '头层牛皮大容量，复古军旅风', price: 1288, category: '背包', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', stock: 8 },
      { id: 'w6', name: '通勤单肩包', description: '植鞣皮简约设计，适合日常通勤', price: 688, category: '背包', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', stock: 10 },
      { id: 'w7', name: '皮革钥匙扣', description: '纯手工制作，小巧精致', price: 58, category: '小物', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', stock: 50 },
      { id: 'w8', name: '皮质书签套装', description: '头层牛皮，3枚装礼盒', price: 88, category: '小物', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', stock: 30 },
      { id: 'w9', name: '编织短款钱包', description: '手工编织皮绳，个性十足', price: 328, category: '钱包', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', stock: 10 },
      { id: 'w10', name: '宽版装饰皮带', description: '复古雕花设计，搭配裙装优选', price: 168, category: '皮带', image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400', stock: 15 },
      { id: 'w11', name: '邮差斜挎包', description: '经典邮差包型，可单肩可斜挎', price: 788, category: '背包', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', stock: 6 },
      { id: 'w12', name: '皮革卡包', description: '超薄设计，多卡位收纳', price: 128, category: '小物', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', stock: 25 },
    ];

    const now = new Date().toISOString();
    seedWorks.forEach(w => works.push({ ...w, created_at: now }));
  }

  if (courses.length === 0) {
    courses.push(
      { id: 'c1', name: '皮具入门体验课', description: '零基础入门，学习基础皮艺工具使用和简单缝制技巧，完成一个小作品', duration: '2小时', price: 198, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400' },
      { id: 'c2', name: '钱包制作进阶课', description: '学习版型设计、边缘处理和高级缝制技巧，完成一个长款钱包', duration: '4小时', price: 498, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400' },
      { id: 'c3', name: '皮带定制工坊', description: '学习裁切、封边、打孔等核心工艺，定制专属皮带', duration: '3小时', price: 358, image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400' }
    );

    const today = new Date();
    const timeSlots = ['10:00', '14:00', '16:00'];
    let slotIdx = 1;

    for (let i = 1; i <= 21; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      if (date.getDay() !== 1 && date.getDay() !== 2) {
        courses.forEach(course => {
          timeSlots.forEach(time => {
            if (Math.random() > 0.3) {
              courseSlots.push({
                id: `slot_${slotIdx++}`,
                course_id: course.id,
                date: dateStr,
                time,
                max_capacity: 6,
                booked_count: Math.floor(Math.random() * 4)
              });
            }
          });
        });
      }
    }
  }
};

export const getWorks = (page: number = 1, pageSize: number = 8, category?: string) => {
  let filtered = [...works];
  if (category && category !== '全部') {
    filtered = works.filter(w => w.category === category);
  }
  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  const paged = filtered.slice(offset, offset + pageSize);
  return { works: paged, total, page, pageSize };
};

export const getWorkById = (id: string) => works.find(w => w.id === id);

export const createOrder = (order: Omit<Order, 'id' | 'created_at'>) => {
  const id = uuidv4();
  const created_at = new Date().toISOString();
  const newOrder: Order = { id, created_at, ...order };
  orders.push(newOrder);
  return { id, ...order };
};

export const getCourses = () => [...courses];

export const getCourseSlots = (courseId: string, date?: string) => {
  let filtered = courseSlots.filter(s => s.course_id === courseId);
  if (date) {
    filtered = filtered.filter(s => s.date === date);
  }
  return [...filtered].sort((a, b) => {
    if (a.date === b.date) return a.time.localeCompare(b.time);
    return a.date.localeCompare(b.date);
  });
};

export const getSlotsByDate = (date: string) => {
  return courseSlots
    .filter(s => s.date === date && s.booked_count < s.max_capacity)
    .map(s => ({ date: s.date, course_id: s.course_id });
};

export const createBooking = (booking: Omit<Booking, 'id' | 'created_at' | 'status'>) => {
  const slot = courseSlots.find(s => s.id === booking.slot_id);
  if (!slot) throw new Error('时段不存在');
  if (slot.booked_count >= slot.max_capacity) throw new Error('该时段已满');

  slot.booked_count += 1;
  const id = uuidv4();
  const created_at = new Date().toISOString();
  const newBooking: Booking = { id, created_at, status: 'booked', ...booking };
  bookings.push(newBooking);
  return { id, ...booking, status: 'booked' as const };
};
