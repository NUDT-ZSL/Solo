import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import MapPage from './pages/MapPage';
import UserPage from './pages/UserPage';
import { Course, User, KnowledgePoint } from './types';
import { pointApi, userApi, courseApi } from './services/api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [points, setPoints] = useState<KnowledgePoint[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    initDefaultData();
  }, []);

  useEffect(() => {
    if (currentCourse) {
      pointApi.getByCourse(currentCourse.id).then(setPoints);
    }
  }, [currentCourse?.id]);

  const initDefaultData = async () => {
    const users = await userApi.getAll();
    const courses = await courseApi.getAll();

    if (users.length === 0) {
      const defaultTeacher = await userApi.create({
        name: '张老师',
        role: 'teacher',
        email: 'teacher@example.com'
      });
      const defaultStudent = await userApi.create({
        name: '李同学',
        role: 'student',
        email: 'student@example.com'
      });
      setCurrentUser(defaultStudent);
    } else {
      const student = users.find(u => u.role === 'student') || users[0];
      setCurrentUser(student);
    }

    if (courses.length === 0) {
      const defaultCourse = await courseApi.create({
        title: '数据结构与算法',
        description: '系统学习常见数据结构和算法，提升编程思维和问题解决能力。',
        coverUrl: ''
      });
      setCurrentCourse(defaultCourse);
      await createSamplePoints(defaultCourse.id);
    } else {
      setCurrentCourse(courses[0]);
    }
  };

  const createSamplePoints = async (courseId: string) => {
    const samplePoints = [
      { title: '数组', description: '数组是一种线性数据结构，由相同类型的元素组成，在内存中连续存储。支持随机访问，时间复杂度O(1)，但插入和删除效率较低。', difficulty: 'beginner' as const, tags: ['基础', '线性结构'], x: 150, y: 150 },
      { title: '链表', description: '链表是一种线性数据结构，每个节点包含数据和指向下一个节点的指针。插入删除效率高O(1)，但访问需要遍历O(n)。', difficulty: 'beginner' as const, tags: ['基础', '线性结构'], x: 150, y: 300 },
      { title: '栈', description: '栈是一种后进先出(LIFO)的数据结构，只能在栈顶进行插入和删除操作。常用于表达式求值、括号匹配、递归等场景。', difficulty: 'beginner' as const, tags: ['基础', '线性结构', 'LIFO'], x: 150, y: 450 },
      { title: '队列', description: '队列是一种先进先出(FIFO)的数据结构，在队尾插入，队头删除。常用于任务调度、广度优先搜索等场景。', difficulty: 'beginner' as const, tags: ['基础', '线性结构', 'FIFO'], x: 350, y: 100 },
      { title: '哈希表', description: '哈希表通过哈希函数将键映射到数组索引，实现平均O(1)的查找、插入和删除。需要处理哈希冲突，常用链地址法和开放寻址法。', difficulty: 'intermediate' as const, tags: ['查找', '中级'], x: 350, y: 250 },
      { title: '二叉树', description: '二叉树是每个节点最多有两个子树的树结构。包括满二叉树、完全二叉树等特殊类型。遍历方式有前序、中序、后序和层序。', difficulty: 'intermediate' as const, tags: ['树形结构', '中级'], x: 350, y: 400 },
      { title: '二分查找', description: '二分查找是在有序数组中查找目标值的高效算法，每次将搜索范围缩小一半，时间复杂度O(log n)。', difficulty: 'beginner' as const, tags: ['查找', '基础', '分治'], x: 550, y: 120 },
      { title: '递归', description: '递归是一种通过调用自身来解决问题的方法，需要有终止条件。常用于树的遍历、分治算法、动态规划等。', difficulty: 'intermediate' as const, tags: ['基础算法', '中级'], x: 550, y: 280 },
      { title: '动态规划', description: '动态规划是通过把原问题分解为相对简单的子问题来求解复杂问题的方法。核心是状态定义和状态转移方程。', difficulty: 'advanced' as const, tags: ['高级算法', '动态规划', '重点'], x: 550, y: 430 },
      { title: '图论基础', description: '图由顶点和边组成，分为有向图和无向图。常用邻接矩阵和邻接表存储。图的遍历有DFS和BFS两种方式。', difficulty: 'intermediate' as const, tags: ['图论', '中级'], x: 750, y: 180 },
      { title: '排序算法', description: '常见排序算法包括冒泡排序、选择排序、插入排序、归并排序、快速排序、堆排序等。需要掌握各算法的时间复杂度和适用场景。', difficulty: 'intermediate' as const, tags: ['基础算法', '排序', '重点'], x: 750, y: 350 },
      { title: '贪心算法', description: '贪心算法在每一步都做出局部最优的选择，期望最终得到全局最优解。适用于具有最优子结构和贪心选择性质的问题。', difficulty: 'advanced' as const, tags: ['高级算法', '贪心'], x: 750, y: 500 }
    ];

    const createdPoints: KnowledgePoint[] = [];
    for (const p of samplePoints) {
      const created = await pointApi.create(courseId, p);
      createdPoints.push(created);
    }

    const titleToId = new Map<string, string>();
    createdPoints.forEach(p => titleToId.set(p.title, p.id));

    const relations = [
      { source: '数组', target: '二分查找' },
      { source: '数组', target: '哈希表' },
      { source: '链表', target: '栈' },
      { source: '链表', target: '队列' },
      { source: '栈', target: '递归' },
      { source: '队列', target: '图论基础' },
      { source: '二分查找', target: '排序算法' },
      { source: '递归', target: '动态规划' },
      { source: '递归', target: '二叉树' },
      { source: '二叉树', target: '图论基础' },
      { source: '二叉树', target: '排序算法' },
      { source: '排序算法', target: '贪心算法' },
      { source: '动态规划', target: '贪心算法' },
      { source: '哈希表', target: '图论基础' }
    ];

    for (const rel of relations) {
      const sourceId = titleToId.get(rel.source);
      const targetId = titleToId.get(rel.target);
      if (sourceId && targetId) {
        const source = createdPoints.find(p => p.id === sourceId)!;
        const target = createdPoints.find(p => p.id === targetId)!;
        await fetch(`/api/courses/${courseId}/relations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId,
            targetId,
            controlX: (source.x + target.x) / 2 + (Math.random() - 0.5) * 40,
            controlY: (source.y + target.y) / 2 - 50 + (Math.random() - 0.5) * 30
          })
        });
      }
    }
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    points.forEach(p => p.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet);
  }, [points]);

  const handleUserChange = () => {
    navigate('/users');
  };

  const handleUserSelect = (user: User) => {
    setCurrentUser(user);
  };

  const handleCourseSelect = (course: Course) => {
    setCurrentCourse(course);
    navigate('/map');
  };

  const isMapPage = location.pathname === '/map' || location.pathname === '/';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {currentCourse && isMapPage && (
        <Header
          courseTitle={currentCourse.title}
          filterTag={filterTag}
          allTags={allTags}
          onTagChange={setFilterTag}
          currentUser={currentUser}
          onUserChange={handleUserChange}
        />
      )}

      <nav style={{
        display: isMapPage ? 'none' : 'flex',
        backgroundColor: '#fff',
        borderBottom: '1px solid #e0e0e0',
        padding: '0 24px',
        gap: 24,
        height: 48,
        alignItems: 'center'
      }}>
        <Link
          to="/map"
          style={{
            textDecoration: 'none',
            color: '#757575',
            fontSize: 14,
            padding: '4px 0'
          }}
        >
          ← 返回图谱
        </Link>
      </nav>

      <main style={{
        flex: 1,
        overflow: 'auto',
        paddingTop: isMapPage ? 56 : 0
      }}>
        <Routes>
          <Route path="/" element={
            <MapPage
              course={currentCourse}
              currentUser={currentUser}
            />
          } />
          <Route path="/map" element={
            <div style={{ height: '100%', padding: 16 }}>
              <MapPage
                course={currentCourse}
                currentUser={currentUser}
              />
            </div>
          } />
          <Route path="/users" element={
            <UserPage
              currentUser={currentUser}
              onUserSelect={handleUserSelect}
              currentCourse={currentCourse}
              onCourseSelect={handleCourseSelect}
            />
          } />
        </Routes>
      </main>

      <style>{`
        @media (max-width: 1024px) and (min-width: 768px) {
          #root > div > main > div > div > div {
            flex-direction: column !important;
          }
          #root > div > main > div > div > div > div:first-child {
            width: 100% !important;
            height: 60vh !important;
            min-height: 400px;
          }
          #root > div > main > div > div > div > div:last-child {
            width: 100% !important;
            max-height: 40vh;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
