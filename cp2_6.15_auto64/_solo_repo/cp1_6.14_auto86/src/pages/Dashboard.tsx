import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, MessageSquare, User } from 'lucide-react';
import http from '../http.js';

interface Course {
  id: string;
  name: string;
  teacher: string;
  unreadComments: number;
}

const Dashboard = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.setItem('token', 'demo-token-' + Date.now());
      localStorage.setItem('userName', '演示用户');
    }
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await http.get('/notes/courses');
      setCourses(data);
    } catch (error) {
      console.error('Failed to load courses:', error);
      const mockCourses: Course[] = [
        { id: '1', name: '数据结构与算法', teacher: '张教授', unreadComments: 5 },
        { id: '2', name: '计算机网络原理', teacher: '李教授', unreadComments: 2 },
        { id: '3', name: '操作系统', teacher: '王教授', unreadComments: 0 },
      ];
      setCourses(mockCourses);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourseName.trim() || !newTeacherName.trim()) return;
    try {
      await http.post('/notes/courses', {
        name: newCourseName,
        teacher: newTeacherName,
      });
      setNewCourseName('');
      setNewTeacherName('');
      setShowModal(false);
      loadCourses();
    } catch (error) {
      console.error('Failed to create course:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-14 px-6 flex items-center justify-between" style={{ backgroundColor: '#2c3e50' }}>
        <div className="flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-white" />
          <h1 className="text-xl font-bold text-white">NoteNest</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:bg-opacity-90"
          style={{ backgroundColor: '#3498db' }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2980b9')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3498db')}
        >
          <Plus className="w-4 h-4" />
          新建课程
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">我的课程</h2>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, 280px)' }}>
          {courses.map((course) => (
            <div
              key={course.id}
              onClick={() => navigate(`/course/${course.id}`)}
              className="p-6 bg-white rounded-xl cursor-pointer transition-all duration-250"
              style={{
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: '#3498db' }}
                >
                  <BookOpen className="w-6 h-6" />
                </div>
                {course.unreadComments > 0 && (
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white"
                    style={{ backgroundColor: '#e74c3c' }}
                  >
                    <MessageSquare className="w-3 h-3" />
                    {course.unreadComments}
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-1">
                {course.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <User className="w-4 h-4" />
                <span>{course.teacher}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">新建课程</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程名称</label>
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入课程名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">授课教师</label>
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入教师姓名"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateCourse}
                  className="flex-1 px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: '#3498db' }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2980b9')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3498db')}
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
