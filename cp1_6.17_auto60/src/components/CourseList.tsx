import type { FC } from 'react';
import type { Course, Homework } from '../data';
import CourseCard from './CourseCard';

interface CourseListProps {
  courses: Course[];
  homeworks: Homework[];
  currentStudentId: string | null;
  onCourseClick: (course: Course) => void;
  onEnroll: (updatedCourse: Course) => void;
}

const CourseList: FC<CourseListProps> = ({
  courses,
  homeworks,
  currentStudentId,
  onCourseClick,
  onEnroll,
}) => {
  return (
    <div className="course-list-page fade-in">
      <div className="page-header">
        <h2>课程列表</h2>
        {currentStudentId && (
          <p className="page-subtitle">选择感兴趣的课程报名，或点击课程查看详情</p>
        )}
      </div>
      {courses.length === 0 ? (
        <div className="empty-state">暂无课程，点击左下角按钮创建新课程</div>
      ) : (
        <div className="course-grid">
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              homeworks={homeworks}
              currentStudentId={currentStudentId}
              onClick={() => onCourseClick(course)}
              onEnroll={onEnroll}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseList;
