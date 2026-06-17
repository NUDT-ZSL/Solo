import { useState } from 'react';
import type { FC } from 'react';
import type { Course, Homework, Student } from '../data';
import StudentList from './StudentList';
import HomeworkPanel from './HomeworkPanel';
import { getEnrolledCount } from '../logic/courseManager';

interface CourseDetailProps {
  course: Course;
  allStudents: Student[];
  homeworks: Homework[];
  onBack: () => void;
  onCourseChange: (updatedCourse: Course) => void;
  onHomeworksChange: (updatedHomeworks: Homework[]) => void;
}

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const CourseDetail: FC<CourseDetailProps> = ({
  course,
  allStudents,
  homeworks,
  onBack,
  onCourseChange,
  onHomeworksChange,
}) => {
  const [attendanceDate, setAttendanceDate] = useState(getTodayStr());

  return (
    <div className="course-detail fade-in">
      <div className="detail-header" style={{ backgroundColor: course.coverColor }}>
        <button className="back-btn" onClick={onBack}>
          ← 返回
        </button>
        <div className="detail-info">
          <h2>{course.name}</h2>
          <p>⏰ {course.schedule} · 👥 {getEnrolledCount(course)} 名学生</p>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-toolbar">
          <label className="date-picker-label">
            选择出勤日期：
            <input
              type="date"
              value={attendanceDate}
              onChange={e => setAttendanceDate(e.target.value)}
            />
          </label>
        </div>

        <div className="detail-sections">
          <StudentList
            course={course}
            allStudents={allStudents}
            attendanceDate={attendanceDate}
            onAttendanceChange={onCourseChange}
          />
          <HomeworkPanel
            course={course}
            homeworks={homeworks}
            onHomeworksChange={onHomeworksChange}
          />
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
