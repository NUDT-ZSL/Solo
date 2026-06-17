import type { FC } from 'react';
import type { Course, Student } from '../data';
import { getEnrolledStudents, getAttendanceRate, isStudentPresent, recordAttendance, getStudentAttendanceRate } from '../logic/courseManager';

interface StudentListProps {
  course: Course;
  allStudents: Student[];
  attendanceDate: string;
  onAttendanceChange: (updatedCourse: Course) => void;
}

const StudentList: FC<StudentListProps> = ({
  course,
  allStudents,
  attendanceDate,
  onAttendanceChange,
}) => {
  const enrolledStudents = getEnrolledStudents(course, allStudents);
  const attendanceRate = getAttendanceRate(course);

  const handleAttendanceToggle = (studentId: string, currentPresent: boolean) => {
    const updated = recordAttendance(course, studentId, attendanceDate, !currentPresent);
    onAttendanceChange(updated);
  };

  const progressColor = attendanceRate >= 80
    ? 'linear-gradient(90deg, #4CAF50, #8BC34A)'
    : attendanceRate >= 60
    ? 'linear-gradient(90deg, #8BC34A, #FFB74D)'
    : 'linear-gradient(90deg, #FFB74D, #E53935)';

  return (
    <div className="student-list-container">
      <div className="attendance-header">
        <h4>学生出勤情况</h4>
        <div className="attendance-date">日期：{attendanceDate}</div>
      </div>

      <div className="attendance-progress">
        <div className="progress-label">
          <span>出勤率</span>
          <span className="progress-percent">{attendanceRate}%</span>
        </div>
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{
              width: `${attendanceRate}%`,
              background: progressColor,
            }}
          />
        </div>
      </div>

      <div className="student-list">
        {enrolledStudents.length === 0 ? (
          <div className="empty-state">暂无学生报名</div>
        ) : (
          enrolledStudents.map(student => {
            const present = isStudentPresent(course, student.id, attendanceDate);
            const studentRate = getStudentAttendanceRate(course, student.id);
            return (
              <div key={student.id} className="student-item">
                <div
                  className="student-avatar"
                  style={{ backgroundColor: student.avatarColor }}
                >
                  {student.name.charAt(0)}
                </div>
                <div className="student-info">
                  <span className="student-name">{student.name}</span>
                  <span className="student-rate">历史出勤率：{studentRate}%</span>
                </div>
                <label className="attendance-checkbox">
                  <input
                    type="checkbox"
                    checked={present}
                    onChange={() => handleAttendanceToggle(student.id, present)}
                  />
                  <span className="checkbox-label">{present ? '已出勤' : '缺勤'}</span>
                </label>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StudentList;
