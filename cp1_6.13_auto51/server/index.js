import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5789;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

app.use(express.json({ limit: '10mb' }));

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory:', dataDir);
}

let surveysDB, responsesDB;

async function initDB() {
  surveysDB = Datastore.create({ filename: path.join(dataDir, 'surveys.db'), autoload: true });
  responsesDB = Datastore.create({ filename: path.join(dataDir, 'responses.db'), autoload: true });
  
  await surveysDB.ensureIndex({ fieldName: 'shortId', unique: true });
  await responsesDB.ensureIndex({ fieldName: 'surveyId' });
  await responsesDB.ensureIndex({ fieldName: 'ip' });
  await responsesDB.ensureIndex({ fieldName: 'clientId' });
  
  console.log('Database initialized successfully');
}

function generateShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getClientIp(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    if (typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }
    if (Array.isArray(xForwardedFor)) {
      return xForwardedFor[0].trim();
    }
  }
  return (
    req.ip ||
    (req.socket && req.socket.remoteAddress) ||
    (req.connection && req.connection.remoteAddress) ||
    (req.connection && req.connection.socket && req.connection.socket.remoteAddress) ||
    'unknown'
  );
}

function checkTimeWindow(submittedAt, now = Date.now()) {
  const diff = now - submittedAt;
  return diff >= 0 && diff < TWENTY_FOUR_HOURS;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/surveys', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate).getTime();
      if (endDate) query.createdAt.$lte = new Date(endDate).getTime() + 86400000;
    }
    
    const surveys = await surveysDB.find(query).sort({ createdAt: -1 });
    res.json(surveys);
  } catch (error) {
    console.error('GET /api/surveys error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/surveys', async (req, res) => {
  try {
    const { title, questions } = req.body;
    
    if (!title || !title.toString().trim()) {
      return res.status(400).json({ error: '问卷标题不能为空' });
    }
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: '至少需要一个问题' });
    }

    let shortId;
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 100) {
      shortId = generateShortId();
      exists = await surveysDB.findOne({ shortId });
      attempts++;
    }
    if (exists) {
      return res.status(500).json({ error: '生成短链接失败，请重试' });
    }

    const survey = {
      _id: uuidv4(),
      shortId,
      title: title.toString().trim(),
      questions,
      createdAt: Date.now(),
      responseCount: 0
    };

    await surveysDB.insert(survey);
    console.log('Survey created:', survey.shortId, '-', survey.title);
    res.status(201).json(survey);
  } catch (error) {
    console.error('POST /api/surveys error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/surveys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const survey = await surveysDB.findOne({ 
      $or: [{ _id: id }, { shortId: id }] 
    });
    
    if (!survey) {
      return res.status(404).json({ error: '问卷不存在' });
    }
    
    res.json(survey);
  } catch (error) {
    console.error('GET /api/surveys/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/surveys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const survey = await surveysDB.findOne({ _id: id });
    if (!survey) {
      return res.status(404).json({ error: '问卷不存在' });
    }
    await surveysDB.remove({ _id: id }, {});
    await responsesDB.remove({ surveyId: id }, { multi: true });
    console.log('Survey deleted:', id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('DELETE /api/surveys/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/surveys/:id/responses', async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const { answers, clientId } = req.body;
    const ip = getClientIp(req);
    const now = Date.now();

    const survey = await surveysDB.findOne({ 
      $or: [{ _id: id }, { shortId: id }] 
    });
    
    if (!survey) {
      return res.status(404).json({ error: '问卷不存在' });
    }

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: '答案格式错误' });
    }

    const cutoffTime = now - TWENTY_FOUR_HOURS;

    const existingByIp = await responsesDB.findOne({
      surveyId: survey._id,
      ip,
    });

    if (existingByIp) {
      const withinWindow = checkTimeWindow(existingByIp.submittedAt, now);
      if (withinWindow) {
        const hoursLeft = Math.ceil((TWENTY_FOUR_HOURS - (now - existingByIp.submittedAt)) / 3600000);
        return res.status(429).json({ 
          error: `24小时内只能提交一次，还剩${hoursLeft}小时可再次提交`,
          retryAfter: TWENTY_FOUR_HOURS - (now - existingByIp.submittedAt)
        });
      }
    }

    if (clientId && clientId.toString().trim()) {
      const existingByClient = await responsesDB.findOne({
        surveyId: survey._id,
        clientId: clientId.toString().trim(),
      });

      if (existingByClient) {
        const withinWindow = checkTimeWindow(existingByClient.submittedAt, now);
        if (withinWindow) {
          const hoursLeft = Math.ceil((TWENTY_FOUR_HOURS - (now - existingByClient.submittedAt)) / 3600000);
          return res.status(429).json({ 
            error: `24小时内只能提交一次，还剩${hoursLeft}小时可再次提交`,
            retryAfter: TWENTY_FOUR_HOURS - (now - existingByClient.submittedAt)
          });
        }
      }
    }

    const response = {
      _id: uuidv4(),
      surveyId: survey._id,
      answers,
      ip,
      clientId: clientId ? clientId.toString().trim() : null,
      submittedAt: now
    };

    await responsesDB.insert(response);
    await surveysDB.update({ _id: survey._id }, { $inc: { responseCount: 1 } });

    const elapsed = Date.now() - startTime;
    console.log(`Response submitted for survey ${survey.shortId}, took ${elapsed}ms`);

    res.status(201).json({ 
      message: '提交成功',
      responseId: response._id,
      processingTime: elapsed
    });
  } catch (error) {
    console.error('POST /api/surveys/:id/responses error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/surveys/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const survey = await surveysDB.findOne({ 
      $or: [{ _id: id }, { shortId: id }] 
    });
    
    if (!survey) {
      return res.status(404).json({ error: '问卷不存在' });
    }

    const responses = await responsesDB.find({ surveyId: survey._id });
    
    const stats = survey.questions.map((question, qIndex) => {
      const questionStats = {
        questionId: question.id,
        questionText: question.text,
        type: question.type,
        totalResponses: responses.length
      };

      if (question.type === 'single' || question.type === 'multiple') {
        const optionCounts = {};
        question.options.forEach(opt => {
          optionCounts[opt] = 0;
        });

        responses.forEach(resp => {
          const answer = resp.answers[qIndex];
          if (answer !== undefined && answer !== null && answer !== '') {
            if (Array.isArray(answer)) {
              answer.forEach(a => {
                if (optionCounts[a] !== undefined) {
                  optionCounts[a]++;
                }
              });
            } else {
              const ansStr = String(answer);
              if (optionCounts[ansStr] !== undefined) {
                optionCounts[ansStr]++;
              }
            }
          }
        });

        questionStats.options = question.options.map(opt => ({
          name: opt,
          count: optionCounts[opt],
          percentage: responses.length > 0 
            ? Math.round((optionCounts[opt] / responses.length) * 100) 
            : 0
        }));
      } else if (question.type === 'text') {
        const allTexts = responses
          .map(resp => resp.answers[qIndex])
          .filter(text => text !== undefined && text !== null && text.toString().trim());
        
        const wordFreq = {};
        allTexts.forEach(text => {
          const textStr = text.toString();
          const words = textStr.split(/[\s，。、！？,.!?;；:："'"'()（）【】\[\]《》""''/\\\-_+\n\r\t]+/).filter(w => w.length >= 2);
          words.forEach(word => {
            const lowerWord = word.toLowerCase();
            wordFreq[lowerWord] = (wordFreq[lowerWord] || 0) + 1;
          });
        });

        const wordCloud = Object.entries(wordFreq)
          .map(([text, value]) => ({ text, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 100);

        questionStats.wordCloud = wordCloud;
        questionStats.allAnswers = allTexts;
      }

      return questionStats;
    });

    res.json({
      survey,
      stats,
      totalResponses: responses.length
    });
  } catch (error) {
    console.error('GET /api/surveys/:id/stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/surveys/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const survey = await surveysDB.findOne({ 
      $or: [{ _id: id }, { shortId: id }] 
    });
    
    if (!survey) {
      return res.status(404).json({ error: '问卷不存在' });
    }

    const responses = await responsesDB.find({ surveyId: survey._id }).sort({ submittedAt: 1 });

    const headers = ['序号', '提交时间', ...survey.questions.map(q => q.text)];
    const rows = responses.map((resp, idx) => {
      const date = new Date(resp.submittedAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const answers = survey.questions.map((_, qIndex) => {
        const answer = resp.answers[qIndex];
        if (answer === undefined || answer === null || answer === '') {
          return '';
        }
        if (Array.isArray(answer)) {
          return answer.join('；');
        }
        return String(answer);
      });
      return [idx + 1, date, ...answers];
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map(r => (r[i] ? String(r[i]).length : 0))
      );
      return { wch: Math.min(maxLen + 4, 60) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '问卷结果');

    const safeTitle = survey.title.replace(/[\\\/:*?"<>|]/g, '_').slice(0, 50);
    const fileName = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );
    res.send(Buffer.from(buffer));

    console.log('Exported survey:', survey._id, '-', responses.length, 'rows');
  } catch (error) {
    console.error('GET /api/surveys/:id/export error:', error);
    res.status(500).json({ error: error.message });
  }
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Data directory: ${dataDir}`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});
