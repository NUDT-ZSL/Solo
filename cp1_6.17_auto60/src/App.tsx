import { useState, useMemo } from 'react';
import type { Course, Homework, Student } from './data';
import { generateStudents, generateCourses, generateHomework } from './data';
import NavBar from './components/NavBar';
import CourseList from './components/CourseList';
import CourseDetail from './components/CourseDetail';
import StudentPanel from './components/StudentPanel';
import CreateCourseModal from './components/CreateCourseModal';
import './styles.css';

type View = 'courses' | 'student';

function App() {
  const students = useMemo<Student[]>(() => generateStudents(), []);
  const initialCourses = useMemo(() => generateCourses(students), [students]);
  const initialHomework = useMemo(() => generateHomework(initialCourses), [initialCourses]);

  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [homeworks, setHomeworks] = useState<Homework[]>(initialHomework);
  const [currentView, setCurrentView] = useState<View>('courses');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(students[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleEnroll = (updatedCourse: Course) => {
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    if (selectedCourse?.id === updatedCourse.id) {
      setSelectedCourse(updatedCourse);
    }
  };

  const handleCourseChange = (updatedCourse: Course) => {
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    setSelectedCourse(updatedCourse);
  };

  const handleCreateCourse = (newCourse: Course) => {
    setCourses(prev => [...prev, newCourse]);
  };

  const displayedCourses = selectedCourse
    ? courses.filter(c => c.id !== selectedCourse.id)
    : courses;

  return (
    <div className="app">
      <NavBar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          setSelectedCourse(null);
        }}
        onCreateCourse={() => setShowCreateModal(true)}
      />

      <main className="main-content">
        {currentView === 'courses' ? (
          selectedCourse ? (
            <CourseDetail
              course={selectedCourse}
              allStudents={students}
              homeworks={homeworks}
              onBack={() => setSelectedCourse(null)}
              onCourseChange={handleCourseChange}
              onHomeworksChange={setHomeworks}
            />
          ) : (
            <CourseList
              courses={displayedCourses}
              homeworks={homeworks}
              currentStudentId={currentStudent?.id ?? null}
              onCourseClick={setSelectedCourse}
              onEnroll={handleEnroll}
            />
          )
        ) : (
          <StudentPanel
            student={currentStudent}
            courses={courses}
            homeworks={homeworks}
            students={students}
            onHomeworksChange={setHomeworks}
            onStudentChange={setCurrentStudent}
          />
        )}
      </main>

      {showCreateModal && (
        <CreateCourseModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCourse}
        />
      )}
    </div>
  );
}

export default App;
