import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import type { Course, Booking, BookingStatus } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

app.use(cors());
app.use(express.json());

function readJSONFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function writeJSONFile<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function generateMockCourses(): Course[] {
  const categories = ['技术类', '管理类', '软技能类'] as const;

  const techInstructors = [
    { name: '张伟', bio: '前阿里高级架构师，15年Java开发经验' },
    { name: '李娜', bio: '字节跳动前端技术专家，Vue核心贡献者' },
    { name: '王强', bio: '腾讯资深后端工程师，微服务架构专家' },
    { name: '刘洋', bio: '华为云原生技术专家，CNCF大使' },
    { name: '陈明', bio: '美团算法专家，机器学习领域资深研究者' },
  ];

  const managementInstructors = [
    { name: '赵芳', bio: '前华为人力资源总监，20年管理经验' },
    { name: '孙磊', bio: '知名创业公司CEO，精益创业实践者' },
    { name: '周琳', bio: '麦肯锡资深顾问，组织发展专家' },
    { name: '吴涛', bio: '前字节跳动产品总监，产品思维训练营创始人' },
    { name: '郑雪', bio: '清华大学MBA，领导力发展教练' },
  ];

  const softSkillInstructors = [
    { name: '钱峰', bio: '知名演讲教练，TEDx演讲者' },
    { name: '冯婷', bio: '职场沟通专家，DISC认证讲师' },
    { name: '褚健', bio: '时间管理专家，高效能人士训练导师' },
    { name: '卫红', bio: '情商研究专家，心理学博士' },
    { name: '蒋华', bio: '职业规划师，10年猎头经验' },
  ];

  const techCourses = [
    'Java高级编程与性能优化',
    'React Hooks深度实战',
    '微服务架构设计与实践',
    'Kubernetes容器化部署',
    '机器学习入门与应用',
    'TypeScript高级类型编程',
    'Redis深度原理与实战',
    'Go语言从入门到精通',
    '大数据处理技术栈',
    '前端工程化最佳实践',
    'Python数据分析',
    '网络安全基础与防护',
    '分布式系统设计',
    '云原生应用开发',
    '数据库优化与索引',
    'Node.js高并发编程',
    'Vue3组合式API实战',
    'Docker容器化技术',
    'API设计与管理',
    '移动端开发技术选型',
  ];

  const managementCourses = [
    '高效团队建设与管理',
    '项目管理PMP认证培训',
    '产品经理核心能力提升',
    '非人力资源经理的HR管理',
    '战略规划与执行',
    '创新思维与设计思考',
    '财务管理非财务经理',
    '敏捷开发与Scrum实践',
    '组织变革管理',
    '绩效管理与激励',
    '跨部门沟通与协作',
    '领导力提升训练营',
    '目标管理与OKR实践',
    '人才招聘与面试技巧',
    '员工发展与培养',
  ];

  const softSkillCourses = [
    '高效沟通与表达技巧',
    '时间管理与高效工作',
    '职场情商修炼',
    '演讲与汇报技巧',
    '压力管理与心理健康',
    '职业规划与发展',
    '商务礼仪与形象管理',
    '谈判技巧与策略',
    '思维导图与高效学习',
    '情绪管理与自我激励',
    '团队协作与冲突处理',
    '文案写作能力提升',
    '逻辑思维与问题解决',
    '人际关系处理技巧',
    '公众演讲与魅力表达',
  ];

  const locations = [
    '总部A座3楼培训室1',
    '总部A座3楼培训室2',
    '总部B座5楼多功能厅',
    '研发中心2楼会议室',
    '线上直播课程',
    '深圳分公司培训室',
    '上海分公司培训室',
    '广州分公司培训室',
  ];

  const courses: Course[] = [];
  let idCounter = 1;

  function createCourse(
    name: string,
    category: typeof categories[number],
    instructor: { name: string; bio: string },
    duration: number,
    maxSlots: number,
    startDate: dayjs.Dayjs
  ): Course {
    return {
      id: uuidv4(),
      name,
      category,
      instructor: instructor.name,
      instructorBio: instructor.bio,
      duration,
      maxSlots,
      bookedSlots: Math.floor(Math.random() * Math.floor(maxSlots * 0.7)),
      outline: `本课程全面系统地介绍${name}的核心概念、技术原理和实战应用。通过理论讲解、案例分析和动手实践相结合的方式，帮助学员快速掌握相关技能，提升工作效率和专业能力。课程涵盖基础入门、进阶技巧、最佳实践和项目实战等多个模块。`,
      rating: 0,
      ratingCount: 0,
      location: locations[Math.floor(Math.random() * locations.length)],
      startTime: startDate.format('YYYY-MM-DD HH:mm'),
    };
  }

  const baseDate = dayjs().add(7, 'day');

  techCourses.forEach((name, index) => {
    const instructor = techInstructors[index % techInstructors.length];
    const duration = [1, 2, 3][Math.floor(Math.random() * 3)];
    const maxSlots = [20, 30, 40, 50][Math.floor(Math.random() * 4)];
    const startDate = baseDate.add(index * 3, 'day').hour(9 + (index % 3) * 2).minute(0);
    courses.push(createCourse(name, '技术类', instructor, duration, maxSlots, startDate));
  });

  managementCourses.forEach((name, index) => {
    const instructor = managementInstructors[index % managementInstructors.length];
    const duration = [1, 2, 2, 3][Math.floor(Math.random() * 4)];
    const maxSlots = [25, 30, 35, 40][Math.floor(Math.random() * 4)];
    const startDate = baseDate.add(index * 4, 'day').hour(9 + (index % 2) * 3).minute(0);
    courses.push(createCourse(name, '管理类', instructor, duration, maxSlots, startDate));
  });

  softSkillCourses.forEach((name, index) => {
    const instructor = softSkillInstructors[index % softSkillInstructors.length];
    const duration = [1, 1, 2][Math.floor(Math.random() * 3)];
    const maxSlots = [30, 40, 50, 60][Math.floor(Math.random() * 4)];
    const startDate = baseDate.add(index * 2, 'day').hour(10 + (index % 2) * 2).minute(0);
    courses.push(createCourse(name, '软技能类', instructor, duration, maxSlots, startDate));
  });

  courses.forEach((course) => {
    const ratings = Math.floor(Math.random() * 20) + 5;
    course.ratingCount = ratings;
    let totalRating = 0;
    for (let i = 0; i < ratings; i++) {
      totalRating += 3.5 + Math.random() * 1.5;
    }
    course.rating = Math.round((totalRating / ratings) * 10) / 10;
    course.bookedSlots = Math.min(course.bookedSlots, course.maxSlots);
  });

  return courses;
}

function generateMockBookings(courses: Course[]): Booking[] {
  const employeeNames = [
    '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
    '郑一', '冯二', '陈三', '褚四', '卫五', '蒋六', '沈七', '韩八',
    '杨九', '朱十', '秦一', '尤二', '许三', '何四', '吕五', '施六',
  ];

  const statuses: BookingStatus[] = ['pending', 'completed', 'cancelled'];
  const bookings: Booking[] = [];
  const feedbacks = [
    '课程内容很充实，讲师讲解清晰，收获很大！',
    '整体不错，希望能有更多实战案例。',
    '非常好的课程，推荐给大家！',
    '内容有点浅，适合入门学员。',
    '讲师经验丰富，讲解生动有趣。',
    '干货满满，值得学习。',
  ];

  courses.slice(0, 15).forEach((course, courseIndex) => {
    const bookingCount = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < bookingCount; i++) {
      const employeeIndex = (courseIndex * 3 + i) % employeeNames.length;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const bookedAt = dayjs().subtract(Math.floor(Math.random() * 30), 'day').format('YYYY-MM-DD HH:mm:ss');

      const booking: Booking = {
        id: uuidv4(),
        courseId: course.id,
        courseName: course.name,
        employeeName: employeeNames[employeeIndex],
        status,
        bookedAt,
      };

      if (status === 'completed') {
        booking.rating = Math.floor(Math.random() * 3) + 3;
        booking.feedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
      }

      if (status === 'cancelled') {
        booking.cancelReason = ['个人原因', '时间冲突', '工作安排'][Math.floor(Math.random() * 3)];
      }

      bookings.push(booking);
    }
  });

  return bookings;
}

function initializeData(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(COURSES_FILE)) {
    const mockCourses = generateMockCourses();
    writeJSONFile(COURSES_FILE, mockCourses);
    console.log(`初始化了 ${mockCourses.length} 门课程数据`);
  } else {
    const courses = readJSONFile<Course[]>(COURSES_FILE);
    if (courses.length === 0) {
      const mockCourses = generateMockCourses();
      writeJSONFile(COURSES_FILE, mockCourses);
      console.log(`初始化了 ${mockCourses.length} 门课程数据`);
    }
  }

  if (!fs.existsSync(BOOKINGS_FILE)) {
    const courses = readJSONFile<Course[]>(COURSES_FILE);
    const mockBookings = generateMockBookings(courses);
    writeJSONFile(BOOKINGS_FILE, mockBookings);
    console.log(`初始化了 ${mockBookings.length} 条预约数据`);
  } else {
    const bookings = readJSONFile<Booking[]>(BOOKINGS_FILE);
    if (bookings.length === 0) {
      const courses = readJSONFile<Course[]>(COURSES_FILE);
      const mockBookings = generateMockBookings(courses);
      writeJSONFile(BOOKINGS_FILE, mockBookings);
      console.log(`初始化了 ${mockBookings.length} 条预约数据`);
    }
  }
}

app.get('/api/courses', (_req: Request, res: Response) => {
  try {
    const courses = readJSONFile<Course[]>(COURSES_FILE);
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取课程列表失败' });
  }
});

app.get('/api/courses/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const courses = readJSONFile<Course[]>(COURSES_FILE);
    const course = courses.find((c) => c.id === id);

    if (!course) {
      return res.status(404).json({ success: false, message: '课程不存在' });
    }

    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取课程详情失败' });
  }
});

app.post('/api/courses', (req: Request, res: Response) => {
  try {
    const { name, category, instructor, instructorBio, duration, maxSlots, outline, location, startTime } = req.body;

    if (!name || !category || !instructor || !duration || !maxSlots || !location || !startTime) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }

    const courses = readJSONFile<Course[]>(COURSES_FILE);

    const newCourse: Course = {
      id: uuidv4(),
      name,
      category,
      instructor,
      instructorBio: instructorBio || '',
      duration: Number(duration),
      maxSlots: Number(maxSlots),
      bookedSlots: 0,
      outline: outline || '',
      rating: 0,
      ratingCount: 0,
      location,
      startTime,
    };

    courses.push(newCourse);
    writeJSONFile(COURSES_FILE, courses);

    res.status(201).json({ success: true, data: newCourse, message: '课程创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建课程失败' });
  }
});

app.put('/api/courses/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const courses = readJSONFile<Course[]>(COURSES_FILE);
    const index = courses.findIndex((c) => c.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: '课程不存在' });
    }

    const updatedCourse = { ...courses[index], ...req.body };
    courses[index] = updatedCourse;
    writeJSONFile(COURSES_FILE, courses);

    res.json({ success: true, data: updatedCourse, message: '课程更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新课程失败' });
  }
});

app.delete('/api/courses/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const courses = readJSONFile<Course[]>(COURSES_FILE);
    const index = courses.findIndex((c) => c.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: '课程不存在' });
    }

    const deletedCourse = courses.splice(index, 1)[0];
    writeJSONFile(COURSES_FILE, courses);

    res.json({ success: true, data: deletedCourse, message: '课程删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除课程失败' });
  }
});

app.get('/api/bookings', (_req: Request, res: Response) => {
  try {
    const bookings = readJSONFile<Booking[]>(BOOKINGS_FILE);
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取预约记录失败' });
  }
});

app.get('/api/bookings/employee/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const bookings = readJSONFile<Booking[]>(BOOKINGS_FILE);
    const employeeBookings = bookings.filter((b) => b.employeeName === name);

    res.json({ success: true, data: employeeBookings });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取员工预约记录失败' });
  }
});

app.post('/api/bookings', (req: Request, res: Response) => {
  try {
    const { courseId, employeeName } = req.body;

    if (!courseId || !employeeName) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }

    const courses = readJSONFile<Course[]>(COURSES_FILE);
    const courseIndex = courses.findIndex((c) => c.id === courseId);

    if (courseIndex === -1) {
      return res.status(404).json({ success: false, message: '课程不存在' });
    }

    const course = courses[courseIndex];
    const remainingSlots = course.maxSlots - course.bookedSlots;

    if (remainingSlots <= 0) {
      return res.status(400).json({ success: false, message: '课程名额已满' });
    }

    const bookings = readJSONFile<Booking[]>(BOOKINGS_FILE);

    const existingBooking = bookings.find(
      (b) => b.courseId === courseId && b.employeeName === employeeName && b.status !== 'cancelled'
    );

    if (existingBooking) {
      return res.status(400).json({ success: false, message: '您已预约过该课程' });
    }

    const newBooking: Booking = {
      id: uuidv4(),
      courseId,
      courseName: course.name,
      employeeName,
      status: 'pending',
      bookedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };

    bookings.push(newBooking);
    writeJSONFile(BOOKINGS_FILE, bookings);

    courses[courseIndex].bookedSlots += 1;
    writeJSONFile(COURSES_FILE, courses);

    res.status(201).json({ success: true, data: newBooking, message: '预约成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建预约失败' });
  }
});

app.put('/api/bookings/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, cancelReason } = req.body;

    if (!status || !['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的状态值' });
    }

    const bookings = readJSONFile<Booking[]>(BOOKINGS_FILE);
    const bookingIndex = bookings.findIndex((b) => b.id === id);

    if (bookingIndex === -1) {
      return res.status(404).json({ success: false, message: '预约记录不存在' });
    }

    const oldStatus = bookings[bookingIndex].status;
    const newStatus = status as BookingStatus;

    const courses = readJSONFile<Course[]>(COURSES_FILE);
    const courseIndex = courses.findIndex((c) => c.id === bookings[bookingIndex].courseId);

    if (oldStatus !== 'cancelled' && newStatus === 'cancelled') {
      if (courseIndex !== -1) {
        courses[courseIndex].bookedSlots = Math.max(0, courses[courseIndex].bookedSlots - 1);
        writeJSONFile(COURSES_FILE, courses);
      }
    }

    if (oldStatus === 'cancelled' && newStatus !== 'cancelled') {
      if (courseIndex !== -1) {
        const course = courses[courseIndex];
        if (course.bookedSlots >= course.maxSlots) {
          return res.status(400).json({ success: false, message: '课程名额已满，无法恢复预约' });
        }
        courses[courseIndex].bookedSlots += 1;
        writeJSONFile(COURSES_FILE, courses);
      }
    }

    bookings[bookingIndex].status = newStatus;
    if (newStatus === 'cancelled' && cancelReason) {
      bookings[bookingIndex].cancelReason = cancelReason;
    }

    writeJSONFile(BOOKINGS_FILE, bookings);

    res.json({ success: true, data: bookings[bookingIndex], message: '状态更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新预约状态失败' });
  }
});

app.put('/api/bookings/:id/feedback', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;

    if (rating === undefined || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: '评分必须在1-5之间' });
    }

    const bookings = readJSONFile<Booking[]>(BOOKINGS_FILE);
    const bookingIndex = bookings.findIndex((b) => b.id === id);

    if (bookingIndex === -1) {
      return res.status(404).json({ success: false, message: '预约记录不存在' });
    }

    const booking = bookings[bookingIndex];

    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: '只能对已完成的课程进行评价' });
    }

    const courses = readJSONFile<Course[]>(COURSES_FILE);
    const courseIndex = courses.findIndex((c) => c.id === booking.courseId);

    if (courseIndex === -1) {
      return res.status(404).json({ success: false, message: '关联课程不存在' });
    }

    const course = courses[courseIndex];
    const hasExistingRating = booking.rating !== undefined;
    const oldRating = booking.rating || 0;

    bookings[bookingIndex].rating = rating;
    bookings[bookingIndex].feedback = feedback;
    writeJSONFile(BOOKINGS_FILE, bookings);

    if (hasExistingRating) {
      const totalRating = course.rating * course.ratingCount - oldRating + rating;
      course.rating = Math.round((totalRating / course.ratingCount) * 10) / 10;
    } else {
      const totalRating = course.rating * course.ratingCount + rating;
      course.ratingCount += 1;
      course.rating = Math.round((totalRating / course.ratingCount) * 10) / 10;
    }

    writeJSONFile(COURSES_FILE, courses);

    res.json({ success: true, data: bookings[bookingIndex], message: '评价提交成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '提交评价失败' });
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

initializeData();

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
