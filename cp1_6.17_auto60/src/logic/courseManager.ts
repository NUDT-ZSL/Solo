import type { Course, Homework, Student, AttendanceRecord } from '../data';

export function enrollStudent(course: Course, studentId: string): Course {
  if (course.enrolledStudentIds.includes(studentId)) {
    return course;
  }
  return {
    ...course,
    enrolledStudentIds: [...course.enrolledStudentIds, studentId]
  };
}

export function isStudentEnrolled(course: Course, studentId: string): boolean {
  return course.enrolledStudentIds.includes(studentId);
}

export function getEnrolledStudents(course: Course, allStudents: Student[]): Student[] {
  return allStudents.filter(s => course.enrolledStudentIds.includes(s.id));
}

export function getEnrolledCount(course: Course): number {
  return course.enrolledStudentIds.length;
}

export function recordAttendance(
  course: Course,
  studentId: string,
  date: string,
  present: boolean
): Course {
  const existingIndex = course.attendanceRecords.findIndex(
    r => r.studentId === studentId && r.date === date
  );
  
  let newRecords: AttendanceRecord[];
  if (existingIndex >= 0) {
    newRecords = [...course.attendanceRecords];
    newRecords[existingIndex] = { studentId, date, present };
  } else {
    newRecords = [...course.attendanceRecords, { studentId, date, present }];
  }

  return {
    ...course,
    attendanceRecords: newRecords
  };
}

export function getAttendanceRate(course: Course): number {
  const records = course.attendanceRecords;
  if (records.length === 0) return 100;
  const presentCount = records.filter(r => r.present).length;
  return Math.round((presentCount / records.length) * 100);
}

export function getStudentAttendanceRate(course: Course, studentId: string): number {
  const studentRecords = course.attendanceRecords.filter(r => r.studentId === studentId);
  if (studentRecords.length === 0) return 100;
  const presentCount = studentRecords.filter(r => r.present).length;
  return Math.round((presentCount / studentRecords.length) * 100);
}

export function isStudentPresent(
  course: Course,
  studentId: string,
  date: string
): boolean {
  const record = course.attendanceRecords.find(
    r => r.studentId === studentId && r.date === date
  );
  return record?.present ?? false;
}

export function createHomework(
  courseId: string,
  title: string,
  deadline: string
): Homework {
  return {
    id: `homework-${Date.now()}`,
    courseId,
    title,
    deadline,
    submittedStudentIds: [],
    reminded: false
  };
}

export function submitHomework(homework: Homework, studentId: string): Homework {
  if (homework.submittedStudentIds.includes(studentId)) {
    return homework;
  }
  return {
    ...homework,
    submittedStudentIds: [...homework.submittedStudentIds, studentId]
  };
}

export function isHomeworkSubmitted(homework: Homework, studentId: string): boolean {
  return homework.submittedStudentIds.includes(studentId);
}

export function getSubmittedCount(homework: Homework): number {
  return homework.submittedStudentIds.length;
}

export function getUnsubmittedCount(homework: Homework, course: Course): number {
  return course.enrolledStudentIds.length - homework.submittedStudentIds.length;
}

export function getTotalUnsubmittedForCourse(
  homeworks: Homework[],
  course: Course
): number {
  return homeworks
    .filter(h => h.courseId === course.id)
    .reduce((sum, h) => sum + getUnsubmittedCount(h, course), 0);
}

export function getCourseHomeworks(homeworks: Homework[], courseId: string): Homework[] {
  return homeworks.filter(h => h.courseId === courseId);
}

export function markReminded(homework: Homework): Homework {
  return {
    ...homework,
    reminded: true
  };
}

export function getStudentCourses(courses: Course[], studentId: string): Course[] {
  return courses.filter(c => c.enrolledStudentIds.includes(studentId));
}

export function getStudentHomeworkStatus(
  homeworks: Homework[],
  courses: Course[],
  studentId: string
): Array<{ homework: Homework; course: Course; submitted: boolean }> {
  const studentCourses = getStudentCourses(courses, studentId);
  const result: Array<{ homework: Homework; course: Course; submitted: boolean }> = [];
  
  for (const course of studentCourses) {
    const courseHomeworks = getCourseHomeworks(homeworks, course.id);
    for (const hw of courseHomeworks) {
      result.push({
        homework: hw,
        course,
        submitted: isHomeworkSubmitted(hw, studentId)
      });
    }
  }
  
  return result;
}

export function createCourse(
  name: string,
  coverColor: string,
  schedule: string
): Course {
  return {
    id: `course-${Date.now()}`,
    name,
    coverColor,
    schedule,
    enrolledStudentIds: [],
    attendanceRecords: []
  };
}
