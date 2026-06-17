export interface Student {
  id: string;
  name: string;
  avatarColor: string;
}

export interface AttendanceRecord {
  studentId: string;
  date: string;
  present: boolean;
}

export interface Homework {
  id: string;
  courseId: string;
  title: string;
  deadline: string;
  submittedStudentIds: string[];
  reminded: boolean;
}

export interface Course {
  id: string;
  name: string;
  coverColor: string;
  schedule: string;
  enrolledStudentIds: string[];
  attendanceRecords: AttendanceRecord[];
}

const avatarColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

const courseColors = [
  '#5C6BC0', '#EF5350', '#66BB6A', '#FFA726',
  '#AB47BC', '#26C6DA', '#EC407A', '#78909C'
];

const studentNames = [
  '张明', '李华', '王芳', '刘洋', '陈静',
  '杨帆', '赵磊', '黄丽', '周强', '吴敏',
  '徐峰', '孙婷', '马军', '朱琳', '胡斌',
  '郭艳', '林浩', '何雪', '高翔', '罗梅',
  '郑超', '梁欣', '谢波', '宋佳', '唐宁',
  '韩雨', '曹阳', '许晶', '邓辉', '冯瑶'
];

const courseNames = [
  '高等数学', '大学英语', '数据结构', '计算机网络',
  '线性代数', '操作系统', '软件工程', '数据库原理'
];

const schedules = [
  '周一 08:00-09:40', '周二 10:00-11:40', '周三 14:00-15:40',
  '周四 16:00-17:40', '周五 08:00-09:40', '周一 14:00-15:40',
  '周三 10:00-11:40', '周五 14:00-15:40'
];

const homeworkTitles = [
  '第一章课后习题', '实验报告一', '期中练习', '编程作业一',
  '第二章课后习题', '实验报告二', '期末复习题', '编程作业二',
  '第三章课后习题', '实验报告三', '综合练习', '项目提案',
  '第四章课后习题', '实验报告四', '期末项目'
];

function randomId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function generateStudents(): Student[] {
  return studentNames.map((name, index) => ({
    id: `student-${index + 1}`,
    name,
    avatarColor: avatarColors[index % avatarColors.length]
  }));
}

export function generateCourses(students: Student[]): Course[] {
  const courses: Course[] = [];
  for (let i = 0; i < 8; i++) {
    const enrolledCount = 10 + Math.floor(Math.random() * 15);
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const enrolledStudents = shuffled.slice(0, enrolledCount);
    
    const attendanceRecords: AttendanceRecord[] = [];
    const today = new Date();
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset * 7);
      const dateStr = formatDate(date);
      enrolledStudents.forEach(student => {
        attendanceRecords.push({
          studentId: student.id,
          date: dateStr,
          present: Math.random() > 0.15
        });
      });
    }

    courses.push({
      id: `course-${i + 1}`,
      name: courseNames[i],
      coverColor: courseColors[i],
      schedule: schedules[i],
      enrolledStudentIds: enrolledStudents.map(s => s.id),
      attendanceRecords
    });
  }
  return courses;
}

export function generateHomework(courses: Course[]): Homework[] {
  const homework: Homework[] = [];
  let hwIndex = 0;
  for (const course of courses) {
    const hwCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < hwCount && hwIndex < 15; i++) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + Math.floor(Math.random() * 14) - 3);
      
      const submittedCount = Math.floor(course.enrolledStudentIds.length * (0.3 + Math.random() * 0.5));
      const shuffled = [...course.enrolledStudentIds].sort(() => Math.random() - 0.5);
      
      homework.push({
        id: `homework-${hwIndex + 1}`,
        courseId: course.id,
        title: homeworkTitles[hwIndex],
        deadline: formatDate(deadline),
        submittedStudentIds: shuffled.slice(0, submittedCount),
        reminded: false
      });
      hwIndex++;
    }
  }
  return homework;
}
