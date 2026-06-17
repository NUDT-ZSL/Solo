import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, User as UserIcon, Plus, GraduationCap, Users, Edit3, Trash2 } from 'lucide-react';
import { useAppStore } from '../store';
import { Course, UserRole, Difficulty } from '../types';

export const UserPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    currentCourse,
    courses,
    knowledgePoints,
    setCurrentUser,
    setCurrentCourse,
    setCourses,
    setKnowledgePoints,
    setAssessments,
    setReviewRecords,
  } = useAppStore();

  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseCoverUrl, setCourseCoverUrl] = useState('');
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentScores, setAssessmentScores] = useState<Record<string, number>>({});

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      const data = await response.json();
      setCourses(data);
    } catch (e) {
      console.error('Failed to load courses', e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), role }),
      });
      const user = await response.json();
      setCurrentUser(user);

      const [assessmentsRes, reviewsRes] = await Promise.all([
        fetch(`/api/users/${user.id}/assessments`),
        fetch(`/api/users/${user.id}/reviews`),
      ]);
      setAssessments(await assessmentsRes.json());
      setReviewRecords(await reviewsRes.json());
    } catch (e) {
      console.error('Failed to login', e);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || role !== 'teacher') return;
    if (!courseTitle.trim() || !courseDescription.trim()) return;

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: courseTitle.trim(),
          description: courseDescription.trim(),
          coverUrl: courseCoverUrl.trim() || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop',
          teacherId: currentUser.id,
        }),
      });
      const course = await response.json();
      setCourses([...courses, course]);
      setShowCourseForm(false);
      setCourseTitle('');
      setCourseDescription('');
      setCourseCoverUrl('');
    } catch (e) {
      console.error('Failed to create course', e);
    }
  };

  const handleSelectCourse = (course: Course) => {
    setCurrentCourse(course);
    navigate('/');
  };

  const handleDeleteCourse = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这门课程吗？相关的知识点和关系也会被删除。')) return;
    
    try {
      const coursePoints = knowledgePoints.filter(p => p.courseId === courseId);
      for (const point of coursePoints) {
        await fetch(`/api/points/${point.id}`, { method: 'DELETE' });
      }
      setCourses(courses.filter(c => c.id !== courseId));
      setKnowledgePoints(knowledgePoints.filter(p => p.courseId !== courseId));
    } catch (e) {
      console.error('Failed to delete course', e);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!currentUser || !currentCourse) return;
    
    try {
      const coursePoints = knowledgePoints.filter(p => p.courseId === currentCourse.id);
      for (const point of coursePoints) {
        const score = assessmentScores[point.id];
        if (score !== undefined) {
          await fetch('/api/assessments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.id,
              courseId: currentCourse.id,
              pointId: point.id,
              score: Math.max(0, Math.min(100, score)),
            }),
          });
        }
      }
      
      const response = await fetch(`/api/users/${currentUser.id}/assessments`);
      setAssessments(await response.json());
      setShowAssessment(false);
      alert('测评已提交！');
    } catch (e) {
      console.error('Failed to submit assessment', e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentCourse(null);
    setCourses([]);
    setKnowledgePoints([]);
    setAssessments([]);
    setReviewRecords([]);
  };

  const teacherCourses = currentUser?.role === 'teacher'
    ? courses.filter(c => c.teacherId === currentUser.id)
    : courses;

  const coursePoints = currentCourse 
    ? knowledgePoints.filter(p => p.courseId === currentCourse.id)
    : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 bg-white flex items-center px-6 border-b"
        style={{ borderBottomColor: '#e0e0e0' }}
      >
        <div className="flex items-center gap-3 flex-1">
          <BookOpen size={24} style={{ color: '#1a237e' }} />
          <h1 className="text-lg font-semibold" style={{ color: '#212121' }}>
            知识图谱复习系统
          </h1>
        </div>
        {currentUser && (
          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: '#757575' }}
          >
            退出登录
          </button>
        )}
      </header>

      <div className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        {!currentUser ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'rgba(26, 35, 126, 0.1)' }}
              >
                <UserIcon size={32} style={{ color: '#1a237e' }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#212121' }}>
                欢迎使用
              </h2>
              <p className="text-sm" style={{ color: '#757575' }}>
                登录以开始学习之旅
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#212121' }}>
                  用户名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00bcd4] transition-all"
                  placeholder="请输入用户名"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#212121' }}>
                  身份选择
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className="flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2"
                    style={{
                      borderColor: role === 'student' ? '#00bcd4' : '#e0e0e0',
                      backgroundColor: role === 'student' ? 'rgba(0, 188, 212, 0.1)' : 'transparent',
                      boxShadow: role === 'student' ? '0 0 0 2px #00bcd4' : 'none',
                    }}
                  >
                    <GraduationCap size={20} style={{ color: role === 'student' ? '#00bcd4' : '#757575' }} />
                    <span
                      className="font-medium"
                      style={{ color: role === 'student' ? '#00bcd4' : '#757575' }}
                    >
                      学生
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className="flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2"
                    style={{
                      borderColor: role === 'teacher' ? '#1a237e' : '#e0e0e0',
                      backgroundColor: role === 'teacher' ? 'rgba(26, 35, 126, 0.1)' : 'transparent',
                      boxShadow: role === 'teacher' ? '0 0 0 2px #1a237e' : 'none',
                    }}
                  >
                    <Users size={20} style={{ color: role === 'teacher' ? '#1a237e' : '#757575' }} />
                    <span
                      className="font-medium"
                      style={{ color: role === 'teacher' ? '#1a237e' : '#757575' }}
                    >
                      教师
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98] mt-6"
                style={{ backgroundColor: '#1a237e' }}
              >
                登录
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#1a237e' }}
                  >
                    <UserIcon size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: '#212121' }}>
                      {currentUser.username}
                    </h2>
                    <p className="text-sm" style={{ color: '#757575' }}>
                      {currentUser.role === 'teacher' ? '教师账号' : '学生账号'}
                    </p>
                  </div>
                </div>
              </div>

              {role === 'teacher' && (
                <button
                  onClick={() => setShowCourseForm(true)}
                  className="w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#00bcd4' }}
                >
                  <Plus size={18} />
                  创建新课程
                </button>
              )}

              {role === 'student' && currentCourse && (
                <button
                  onClick={() => {
                    setShowAssessment(true);
                    const scores: Record<string, number> = {};
                    coursePoints.forEach(p => {
                      scores[p.id] = Math.floor(Math.random() * 100);
                    });
                    setAssessmentScores(scores);
                  }}
                  className="w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#00bcd4' }}
                >
                  <Edit3 size={18} />
                  完成课后测评
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#212121' }}>
                {role === 'teacher' ? '我的课程' : '可选课程'}
              </h3>

              {teacherCourses.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen size={48} className="mx-auto mb-4" style={{ color: '#bdbdbd' }} />
                  <p className="text-sm" style={{ color: '#757575' }}>
                    {role === 'teacher' ? '还没有创建课程' : '暂无可用课程'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {teacherCourses.map((course) => {
                    const pointCount = knowledgePoints.filter(p => p.courseId === course.id).length;
                    const isSelected = currentCourse?.id === course.id;
                    
                    return (
                      <div
                        key={course.id}
                        onClick={() => handleSelectCourse(course)}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md"
                        style={{
                          borderColor: isSelected ? '#1a237e' : '#e0e0e0',
                          boxShadow: isSelected ? '0 0 0 2px #1a237e' : 'none',
                        }}
                      >
                        <img
                          src={course.coverUrl}
                          alt={course.title}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold" style={{ color: '#212121' }}>
                            {course.title}
                          </h4>
                          <p className="text-sm mt-1 line-clamp-2" style={{ color: '#757575' }}>
                            {course.description}
                          </p>
                          <p className="text-xs mt-2" style={{ color: '#00bcd4' }}>
                            {pointCount} 个知识点
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {role === 'teacher' && (
                            <button
                              onClick={(e) => handleDeleteCourse(course.id, e)}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          {isSelected && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              当前选择
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentCourse && (
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98] mt-6"
                  style={{ backgroundColor: '#1a237e' }}
                >
                  进入知识图谱
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showCourseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCourseForm(false)} />
          <div
            className="relative bg-white rounded-2xl shadow-2xl z-10 w-full max-w-md overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6" style={{ color: '#212121' }}>
                创建新课程
              </h2>
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#212121' }}>
                    课程标题
                  </label>
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00bcd4] transition-all"
                    placeholder="请输入课程标题"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#212121' }}>
                    课程简介
                  </label>
                  <textarea
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00bcd4] transition-all resize-none"
                    rows={3}
                    placeholder="请输入课程简介"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#212121' }}>
                    封面图片URL（可选）
                  </label>
                  <input
                    type="url"
                    value={courseCoverUrl}
                    onChange={(e) => setCourseCoverUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00bcd4] transition-all"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCourseForm(false)}
                    className="flex-1 py-3 rounded-xl font-medium border-2 transition-all hover:bg-gray-50"
                    style={{ borderColor: '#e0e0e0', color: '#757575' }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: '#1a237e' }}
                  >
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showAssessment && currentCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAssessment(false)} />
          <div
            className="relative bg-white rounded-2xl shadow-2xl z-10 w-full max-w-lg overflow-hidden my-8"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
          >
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-2" style={{ color: '#212121' }}>
                课后测评
              </h2>
              <p className="text-sm mb-6" style={{ color: '#757575' }}>
                请为以下知识点打分（0-100）
              </p>
              <div className="space-y-4">
                {coursePoints.map((point) => (
                  <div key={point.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium" style={{ color: '#212121' }}>{point.title}</p>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{
                            backgroundColor:
                              point.difficulty === '初级'
                                ? '#81c784'
                                : point.difficulty === '中级'
                                ? '#ffb74d'
                                : '#e57373',
                          }}
                        >
                          {point.difficulty}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={assessmentScores[point.id] ?? ''}
                        onChange={(e) =>
                          setAssessmentScores({
                            ...assessmentScores,
                            [point.id]: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-[#00bcd4]"
                      />
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${assessmentScores[point.id] || 0}%`,
                          backgroundColor:
                            (assessmentScores[point.id] || 0) >= 60 ? '#81c784' : '#e57373',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => setShowAssessment(false)}
                  className="flex-1 py-3 rounded-xl font-medium border-2 transition-all hover:bg-gray-50"
                  style={{ borderColor: '#e0e0e0', color: '#757575' }}
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitAssessment}
                  className="flex-1 py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#1a237e' }}
                >
                  提交测评
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
