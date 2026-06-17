import type { Course, User } from '../types';
import './Header.css';

interface HeaderProps {
  course?: Course;
  courses: Course[];
  onCourseChange: (id: string) => void;
  user: User | null;
}

function Header({ course, courses, onCourseChange, user }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">📚</span>
          <span className="logo-text">知识图谱复习系统</span>
        </div>
      </div>

      <div className="header-center">
        {courses.length > 0 && (
          <select
            className="course-selector"
            value={course?.id || ''}
            onChange={(e) => onCourseChange(e.target.value)}
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        )}
      </div>

      <div className="header-right">
        {user && (
          <div className="user-info">
            <span className="user-avatar">
              {user.name.charAt(0)}
            </span>
            <span className="user-name">{user.name}</span>
            <span className={`user-role ${user.role}`}>
              {user.role === 'teacher' ? '教师' : '学生'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
