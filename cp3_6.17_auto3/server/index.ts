import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5050;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');

const readJsonFile = (filename: string) => {
  const filePath = path.join(dataDir, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
};

const writeJsonFile = (filename: string, data: any) => {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const DIMENSIONS = ['基础知识', '逻辑分析', '代码理解', '安全规范', '项目管理'];

app.get('/api/subjects', (req, res) => {
  try {
    const subjects = readJsonFile('subjects.json');
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: '获取科目列表失败' });
  }
});

app.get('/api/questions', (req, res) => {
  try {
    const { subjectId } = req.query;
    let questions = readJsonFile('questions.json');
    
    if (subjectId) {
      questions = questions.filter((q: any) => q.subject === subjectId);
    }
    
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: '获取题目失败' });
  }
});

app.post('/api/submit', (req, res) => {
  try {
    const { answers, subjectId, duration } = req.body;
    const questions = readJsonFile('questions.json').filter((q: any) => q.subject === subjectId);
    const subjects = readJsonFile('subjects.json');
    const subject = subjects.find((s: any) => s.id === subjectId);
    
    let correctCount = 0;
    const wrongQuestions: any[] = [];
    const dimensionStats: Record<string, { correct: number; total: number }> = {};
    
    DIMENSIONS.forEach(d => {
      dimensionStats[d] = { correct: 0, total: 0 };
    });
    
    questions.forEach((q: any, index: number) => {
      const userAnswer = answers[index];
      const dimension = q.dimension;
      
      if (dimensionStats[dimension]) {
        dimensionStats[dimension].total++;
      }
      
      if (userAnswer === q.correctAnswer) {
        correctCount++;
        if (dimensionStats[dimension]) {
          dimensionStats[dimension].correct++;
        }
      } else {
        wrongQuestions.push(q);
      }
    });
    
    const score = Math.round((correctCount / questions.length) * 100);
    
    const dimensionScores: Record<string, number> = {};
    Object.entries(dimensionStats).forEach(([name, stats]) => {
      dimensionScores[name] = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    });
    
    const record = {
      id: uuidv4(),
      subjectId,
      subjectName: subject?.name || '',
      score,
      totalQuestions: questions.length,
      correctCount,
      duration: duration || 0,
      answers,
      date: new Date().toISOString(),
      dimensionScores,
    };
    
    const records = readJsonFile('records.json');
    records.unshift(record);
    if (records.length > 50) {
      records.length = 50;
    }
    writeJsonFile('records.json', records);
    
    res.json({
      score,
      correctCount,
      totalQuestions: questions.length,
      wrongQuestions,
      dimensionScores,
      recordId: record.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '评分失败' });
  }
});

app.get('/api/records', (req, res) => {
  try {
    const records = readJsonFile('records.json');
    res.json(records.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: '获取记录失败' });
  }
});

app.get('/api/records/:id', (req, res) => {
  try {
    const { id } = req.params;
    const records = readJsonFile('records.json');
    const record = records.find((r: any) => r.id === id);
    
    if (!record) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    
    const questions = readJsonFile('questions.json').filter((q: any) => q.subject === record.subjectId);
    const wrongQuestions = questions.filter((q: any, idx: number) => record.answers[idx] !== q.correctAnswer);
    
    res.json({
      ...record,
      wrongQuestions,
    });
  } catch (error) {
    res.status(500).json({ error: '获取记录失败' });
  }
});

app.post('/api/questions', (req, res) => {
  try {
    const question = {
      id: uuidv4(),
      ...req.body,
    };
    
    const questions = readJsonFile('questions.json');
    questions.push(question);
    writeJsonFile('questions.json', questions);
    
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ error: '添加题目失败' });
  }
});

app.get('/api/admin/records', (req, res) => {
  try {
    const records = readJsonFile('records.json');
    const formatted = records.map((r: any) => ({
      ...r,
      dateFormatted: dayjs(r.date).format('YYYY-MM-DD HH:mm:ss'),
      durationFormatted: formatDuration(r.duration),
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: '获取记录失败' });
  }
});

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分${secs}秒`;
};

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
