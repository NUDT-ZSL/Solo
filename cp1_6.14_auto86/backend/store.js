import { v4 as uuidv4 } from 'uuid';

const store = {
  courses: [],
  chapters: [],
  notes: [],
  noteVersions: [],
  comments: [],
};

const generateMockData = () => {
  const course1Id = uuidv4();
  const course2Id = uuidv4();

  store.courses = [
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
    },
  ];

  const chapter1Id = uuidv4();
  const chapter2Id = uuidv4();
  const chapter3Id = uuidv4();
  const chapter4Id = uuidv4();

  store.chapters = [
    {
      id: chapter1Id,
      courseId: course1Id,
      name: '第一章 算法基础',
      order: 1,
      hasUpdate: true,
    },
    {
      id: chapter2Id,
      courseId: course1Id,
      name: '第二章 线性表',
      order: 2,
      hasUpdate: false,
    },
    {
      id: chapter3Id,
      courseId: course1Id,
      name: '第三章 栈和队列',
      order: 3,
      hasUpdate: true,
    },
    {
      id: chapter4Id,
      courseId: course2Id,
      name: '第一章 网络体系结构',
      order: 1,
      hasUpdate: false,
    },
  ];

  const note1Id = uuidv4();
  const version1Id = uuidv4();
  const version2Id = uuidv4();

  store.notes = [
    {
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
    },
  ];

  store.noteVersions = [
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
    },
  ];

  store.comments = [
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
    },
  ];
};

generateMockData();

export default store;
