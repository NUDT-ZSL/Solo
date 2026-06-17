import { useState } from 'react';
import type { FC } from 'react';
import type { Course, Homework } from '../data';
import { getEnrolledCount, isStudentEnrolled, enrollStudent, getTotalUnsubmittedForCourse } from '../logic/courseManager';
import AnimatedNumber from './AnimatedNumber';

interface CourseCardProps {
  course: Course;
  homeworks: Homework[];
  currentStudentId: string | null;
  onClick: () => void;
  onEnroll: (updatedCourse: Course) => void;
}

const CourseCard: FC<CourseCardProps> = ({
  course,
  homeworks,
  currentStudentId,
  onClick,
  onEnroll,
}) => {
  const [enrolling, setEnrolling] = useState(false);
  const enrolled = currentStudentId ? isStudentEnrolled(course, currentStudentId) : false;
  const studentCount = getEnrolledCount(course);
  const unsubmittedCount = getTotalUnsubmittedForCourse(homeworks, course);

  const handleEnrollClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentStudentId || enrolled) return;

    setEnrolling(true);
    const updated = enrollStudent(course, currentStudentId);
    onEnroll(updated);

    setTimeout(() => setEnrolling(false), 200);
  };

  return (
    <div
      className="course-card"
      style={{ backgroundColor: course.coverColor }}
      onClick={onClick}
    >
      <div className="card-header">
        <h3 className="course-name">{course.name}</h3>
        <button
          className={`enroll-btn ${enrolled ? 'enrolled' : ''} ${enrolling ? 'scaling' : ''}`}
          onClick={handleEnrollClick}
          disabled={enrolled}
        >
          {enrolled ? '已报名' : '报名'}
        </button>
      </div>
      <div className="course-schedule">⏰ {course.schedule}</div>
      <div className="card-footer">
        <span className="stat stat-green">
          <span className="stat-icon">👥</span>
          <AnimatedNumber value={studentCount} className="stat-number stat-number-green" />
          <span className="stat-unit">人</span>
        </span>
        <span className="stat stat-red">
          <span className="stat-icon">📝</span>
          <AnimatedNumber value={unsubmittedCount} className="stat-number stat-number-red" />
          <span className="stat-unit">份未交</span>
        </span>
      </div>
    </div>
  );
};

export default CourseCard;
