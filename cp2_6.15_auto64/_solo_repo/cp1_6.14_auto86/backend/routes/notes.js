import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const courses = [];
const chapters = [];
const notes = [];
const noteVersions = [];
const comments = [];

const initMockData = () => {
  const course1Id = uuidv4();
  const course2Id = uuidv4();

  courses.push(
    {
      id: course1Id,
      name: '数据结构与算法',
      teacher: '张教授',
      unreadComments: 5,
      createdAt: new Date('2026-01-15').toISOString(),
    },
    {
      id: course2Id,
      name: '计算机网络原理',
      teacher: '李教授',
      unreadComments: 2,
      createdAt: new Date('2026-02-20').toISOString(),
    }
  );

  const chapter1Id = uuidv4();
  const chapter2Id = uuidv4();
  const chapter3Id = uuidv4();
  const chapter4Id = uuidv4();

  chapters.push(
    { id: chapter1Id, courseId: course1Id, name: '第一章 算法基础', order: 1, hasUpdate: true },
    { id: chapter2Id, courseId: course1Id, name: '第二章 线性表', order: 2, hasUpdate: false },
    { id: chapter3Id, courseId: course1Id, name: '第三章 栈和队列', order: 3, hasUpdate: true },
    { id: chapter4Id, courseId: course2Id, name: '第一章 网络体系结构', order: 1, hasUpdate: false }
  );

  const note1Id = uuidv4();
  const version1Id = uuidv4();
  const version2Id = uuidv4();

  notes.push({
    id: note1Id,
    chapterId: chapter1Id,
    content: `<h1>算法基础</h1><p>算法是解决特定问题求解步骤的描述，在计算机中表现为指令的有限序列。</p><h2>算法的特性</h2><ul><li>有穷性</li><li>确定性</li><li>可行性</li><li>输入</li><li>输出</li></ul><h3>时间复杂度</h3><p>常见的时间复杂度：</p><ol><li>O(1) - 常数阶</li><li>O(log n) - 对数阶</li><li>O(n) - 线性阶</li><li>O(n²) - 平方阶</li></ol><p>代码示例：</p><pre><code>function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}</code></pre>`,
    currentVersionId: version2Id,
  });

  noteVersions.push(
    {
      id: version1Id,
      noteId: note1Id,
      content: `<h1>算法基础</h1><p>算法是解决特定问题求解步骤的描述。</p><h2>算法的特性</h2><ul><li>有穷性</li><li>确定性</li><li>可行性</li></ul>`,
      createdAt: new Date('2026-01-20 10:30:00').toISOString(),
      versionNumber: 1,
    },
    {
      id: version2Id,
      noteId: note1Id,
      content: `<h1>算法基础</h1><p>算法是解决特定问题求解步骤的描述，在计算机中表现为指令的有限序列。</p><h2>算法的特性</h2><ul><li>有穷性</li><li>确定性</li><li>可行性</li><li>输入</li><li>输出</li></ul><h3>时间复杂度</h3><p>常见的时间复杂度：</p><ol><li>O(1) - 常数阶</li><li>O(log n) - 对数阶</li><li>O(n) - 线性阶</li><li>O(n²) - 平方阶</li></ol><p>代码示例：</p><pre><code>function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}</code></pre>`,
      createdAt: new Date('2026-01-22 14:15:00').toISOString(),
      versionNumber: 2,
    }
  );

  comments.push(
    {
      id: uuidv4(),
      noteId: note1Id,
      userId: 'user1',
      userName: '王小明',
      content: '这个排序算法的时间复杂度是O(n²)，有没有更高效的排序算法？',
      createdAt: new Date('2026-01-23 09:00:00').toISOString(),
    },
    {
      id: uuidv4(),
      noteId: note1Id,
      userId: 'user2',
      userName: '李小红',
      content: '快速排序的平均时间复杂度是O(n log n)，比冒泡排序快很多。',
      createdAt: new Date('2026-01-23 10:30:00').toISOString(),
    }
  );
};

initMockData();

router.get('/courses', (req, res) => {
  res.json(courses);
});

router.get('/courses/:id', (req, res) => {
  const { id } = req.params;
  const course = courses.find(c => c.id === id);
  if (course) {
    res.json(course);
  } else {
    res.status(404).json({ error: 'Course not found' });
  }
});

router.post('/courses', (req, res) => {
  const { name, teacher } = req.body;
  const course = {
    id: uuidv4(),
    name,
    teacher,
    unreadComments: 0,
    createdAt: new Date().toISOString(),
  };
  courses.push(course);
  res.json(course);
});

router.get('/courses/:courseId/chapters', (req, res) => {
  const { courseId } = req.params;
  const courseChapters = chapters
    .filter(c => c.courseId === courseId)
    .sort((a, b) => a.order - b.order);
  res.json(courseChapters);
});

router.get('/:chapterId', (req, res) => {
  const { chapterId } = req.params;
  const note = notes.find(n => n.chapterId === chapterId);

  if (note) {
    res.json(note);
  } else {
    res.json({
      id: uuidv4(),
      chapterId,
      content: '',
      currentVersionId: null,
    });
  }
});

router.post('/', (req, res) => {
  const { chapterId, content } = req.body;

  let note = notes.find(n => n.chapterId === chapterId);
  const versionNumber = note
    ? noteVersions.filter(v => v.noteId === note.id).length + 1
    : 1;

  if (!note) {
    const noteId = uuidv4();
    note = {
      id: noteId,
      chapterId,
      content,
      currentVersionId: null,
    };
    notes.push(note);
  }

  const versionId = uuidv4();
  const version = {
    id: versionId,
    noteId: note.id,
    content,
    createdAt: new Date().toISOString(),
    versionNumber,
  };
  noteVersions.push(version);

  note.content = content;
  note.currentVersionId = versionId;

  res.json({ note, version });
});

router.get('/:noteId/versions', (req, res) => {
  const { noteId } = req.params;
  const versions = noteVersions
    .filter(v => v.noteId === noteId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(versions);
});

router.get('/versions/:versionId', (req, res) => {
  const { versionId } = req.params;
  const version = noteVersions.find(v => v.id === versionId);
  if (version) {
    res.json(version);
  } else {
    res.status(404).json({ error: 'Version not found' });
  }
});

router.get('/:noteId/comments', (req, res) => {
  const { noteId } = req.params;
  const noteComments = comments
    .filter(c => c.noteId === noteId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(noteComments);
});

router.post('/comments', (req, res) => {
  const { noteId, userId, userName, content } = req.body;
  const comment = {
    id: uuidv4(),
    noteId,
    userId,
    userName,
    content,
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  res.json(comment);
});

export default router;
