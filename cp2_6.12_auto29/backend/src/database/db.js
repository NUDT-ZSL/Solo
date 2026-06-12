const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', '..', 'data', 'exam.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initTables() {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
      display_name TEXT NOT NULL,
      class_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('single', 'multiple', 'essay')),
      content TEXT NOT NULL,
      options TEXT,
      correct_answers TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
      knowledge_point TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      question_ids TEXT NOT NULL,
      total_score INTEGER NOT NULL DEFAULT 100,
      deadline DATETIME NOT NULL,
      review_start DATETIME NOT NULL,
      review_deadline DATETIME NOT NULL,
      teacher_id TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      answers TEXT,
      submitted INTEGER NOT NULL DEFAULT 0,
      absent INTEGER NOT NULL DEFAULT 0,
      submitted_at DATETIME,
      UNIQUE (assignment_id, student_id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(id),
      FOREIGN KEY (student_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      reviewee_id TEXT NOT NULL,
      scores TEXT,
      feedback TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at DATETIME,
      UNIQUE (submission_id, reviewer_id),
      FOREIGN KEY (submission_id) REFERENCES submissions(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (reviewee_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_questions_teacher ON questions(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
    CREATE INDEX IF NOT EXISTS idx_questions_knowledge ON questions(knowledge_point);
    CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_submission ON reviews(submission_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
  `;

  db.exec(createTablesSQL);
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, password, role, display_name, class_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const teacherId = uuidv4();
  insertUser.run(teacherId, 'teacher1', '123456', 'teacher', '张老师', null);

  const studentNames = ['学生甲', '学生乙', '学生丙', '学生丁', '学生戊'];
  const studentIds = [];
  for (let i = 0; i < 5; i++) {
    const id = uuidv4();
    studentIds.push(id);
    insertUser.run(id, `student${i + 1}`, '123456', 'student', studentNames[i], '计科1班');
  }

  const questionCount = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
  if (questionCount > 0) return;

  const insertQuestion = db.prepare(`
    INSERT INTO questions (id, type, content, options, correct_answers, difficulty, knowledge_point, teacher_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const questions = [
    {
      type: 'single',
      content: '在JavaScript中，以下哪个关键字用于声明常量？',
      options: JSON.stringify(['var', 'let', 'const', 'static']),
      correct_answers: JSON.stringify(['C']),
      difficulty: 'easy',
      knowledge_point: 'JavaScript基础'
    },
    {
      type: 'single',
      content: 'HTTP协议默认使用的端口号是？',
      options: JSON.stringify(['21', '22', '80', '443']),
      correct_answers: JSON.stringify(['C']),
      difficulty: 'easy',
      knowledge_point: '计算机网络'
    },
    {
      type: 'single',
      content: '下列哪种数据结构是先进先出(FIFO)？',
      options: JSON.stringify(['栈', '队列', '链表', '二叉树']),
      correct_answers: JSON.stringify(['B']),
      difficulty: 'easy',
      knowledge_point: '数据结构'
    },
    {
      type: 'single',
      content: '时间复杂度为O(n log n)的排序算法是？',
      options: JSON.stringify(['冒泡排序', '选择排序', '快速排序', '插入排序']),
      correct_answers: JSON.stringify(['C']),
      difficulty: 'medium',
      knowledge_point: '算法分析'
    },
    {
      type: 'single',
      content: '在操作系统中，进程和线程的主要区别是？',
      options: JSON.stringify([
        '进程是资源分配的基本单位，线程是CPU调度的基本单位',
        '线程是资源分配的基本单位，进程是CPU调度的基本单位',
        '进程和线程没有区别',
        '进程比线程执行速度更快'
      ]),
      correct_answers: JSON.stringify(['A']),
      difficulty: 'medium',
      knowledge_point: '操作系统'
    },
    {
      type: 'multiple',
      content: '以下哪些是JavaScript的基本数据类型？（多选）',
      options: JSON.stringify(['String', 'Number', 'Array', 'Boolean', 'Object']),
      correct_answers: JSON.stringify(['A', 'B', 'D']),
      difficulty: 'easy',
      knowledge_point: 'JavaScript基础'
    },
    {
      type: 'multiple',
      content: '以下哪些属于TCP协议的特性？（多选）',
      options: JSON.stringify(['面向连接', '可靠传输', '无连接', '流量控制', '不可靠']),
      correct_answers: JSON.stringify(['A', 'B', 'D']),
      difficulty: 'medium',
      knowledge_point: '计算机网络'
    },
    {
      type: 'multiple',
      content: '下列哪些是关系型数据库？（多选）',
      options: JSON.stringify(['MySQL', 'MongoDB', 'PostgreSQL', 'Redis', 'Oracle']),
      correct_answers: JSON.stringify(['A', 'C', 'E']),
      difficulty: 'easy',
      knowledge_point: '数据库'
    },
    {
      type: 'multiple',
      content: '面向对象编程的基本特性包括？（多选）',
      options: JSON.stringify(['封装', '继承', '多态', '递归', '抽象']),
      correct_answers: JSON.stringify(['A', 'B', 'C', 'E']),
      difficulty: 'medium',
      knowledge_point: '面向对象编程'
    },
    {
      type: 'essay',
      content: '请简述HTTP和HTTPS的区别，以及HTTPS的工作原理。',
      options: null,
      correct_answers: JSON.stringify(['参考要点：1. HTTP是明文传输，HTTPS是加密传输；2. HTTPS使用SSL/TLS协议；3. 默认端口不同（80 vs 443）；4. HTTPS需要CA证书；5. 工作原理包括握手、密钥交换、加密传输等过程。']),
      difficulty: 'hard',
      knowledge_point: '计算机网络'
    },
    {
      type: 'essay',
      content: '请解释什么是死锁，产生死锁的四个必要条件是什么，以及常见的死锁避免策略。',
      options: null,
      correct_answers: JSON.stringify(['参考要点：1. 死锁定义：多个进程互相等待对方释放资源而无限期阻塞；2. 四个必要条件：互斥、请求与保持、不剥夺、循环等待；3. 避免策略：破坏任意一个必要条件，如银行家算法、资源有序分配等。']),
      difficulty: 'hard',
      knowledge_point: '操作系统'
    },
    {
      type: 'essay',
      content: '请比较快速排序和归并排序的原理、时间复杂度、空间复杂度及适用场景。',
      options: null,
      correct_answers: JSON.stringify(['参考要点：1. 原理：快排基于分治+分区，归并基于分治+合并；2. 平均时间复杂度均为O(n log n)；3. 最坏情况：快排O(n²)，归并O(n log n)；4. 空间复杂度：快排O(log n)，归并O(n)；5. 稳定性：快排不稳定，归并稳定；6. 适用场景：快排适合一般情况，归并适合大数据量或需要稳定性的场景。']),
      difficulty: 'hard',
      knowledge_point: '算法分析'
    }
  ];

  for (const q of questions) {
    insertQuestion.run(
      uuidv4(),
      q.type,
      q.content,
      q.options,
      q.correct_answers,
      q.difficulty,
      q.knowledge_point,
      teacherId
    );
  }
}

db.runQuery = function(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
};

db.getQuery = function(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
};

db.allQuery = function(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
};

initTables();
seedData();

module.exports = db;
