import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5789;

app.use(express.json());

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let surveysDB, responsesDB;

async function initDB() {
  surveysDB = Datastore.create(path.join(dataDir, 'surveys.db'));
  responsesDB = Datastore.create(path.join(dataDir, 'responses.db'));
  
  await surveysDB.ensureIndex({ fieldName: 'shortId', unique: true });
  await responsesDB.ensureIndex({ fieldName: 'surveyId' });
  
  console.log('Database initialized');
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
  return req.ip || 
         req.headers['x-forwarded-for'] || 
         (req.connection && req.connection.remoteAddress) || 
         (req.socket && req.socket.remoteAddress) ||
         (req.connection && req.connection.socket && req.connection.socket.remoteAddress) || 
         'unknown';
}

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
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/surveys', async (req, res) => {
  try {
    const { title, questions } = req.body;
    
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: '问卷标题和问题不能为空' });
    }

    let shortId;
    let exists = true;
    while (exists) {
      shortId = generateShortId();
      exists = await surveysDB.findOne({ shortId });
    }

    const survey = {
      _id: uuidv4(),
      shortId,
      title,
      questions,
      createdAt: Date.now(),
      responseCount: 0
    };

    await surveysDB.insert(survey);
    res.status(201).json(survey);
  } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/surveys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await surveysDB.remove({ _id: id }, {});
    await responsesDB.remove({ surveyId: id }, { multi: true });
    
    if (result === 0) {
      return res.status(404).json({ error: '问卷不存在' });
    }
    
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/surveys/:id/responses', async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, clientId } = req.body;
    const ip = getClientIp(req);

    const survey = await surveysDB.findOne({ 
      $or: [{ _id: id }, { shortId: id }] 
    });
    
    if (!survey) {
      return res.status(404).json({ error: '问卷不存在' });
    }

    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    const existingByIp = await responsesDB.findOne({
      surveyId: survey._id,
      ip,
      submittedAt: { $gte: twentyFourHoursAgo }
    });

    if (existingByIp) {
      return res.status(429).json({ error: '24小时内只能提交一次' });
    }

    if (clientId) {
      const existingByClient = await responsesDB.findOne({
        surveyId: survey._id,
        clientId,
        submittedAt: { $gte: twentyFourHoursAgo }
      });

      if (existingByClient) {
        return res.status(429).json({ error: '24小时内只能提交一次' });
      }
    }

    const response = {
      _id: uuidv4(),
      surveyId: survey._id,
      answers,
      ip,
      clientId,
      submittedAt: Date.now()
    };

    await responsesDB.insert(response);
    await surveysDB.update({ _id: survey._id }, { $inc: { responseCount: 1 } });

    res.status(201).json({ message: '提交成功' });
  } catch (error) {
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
          if (answer) {
            if (Array.isArray(answer)) {
              answer.forEach(a => {
                if (optionCounts[a] !== undefined) {
                  optionCounts[a]++;
                }
              });
            } else {
              if (optionCounts[answer] !== undefined) {
                optionCounts[answer]++;
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
          .filter(text => text && text.toString().trim());
        
        const wordFreq = {};
        allTexts.forEach(text => {
          const words = text.toString().split(/[\s，。、！？,.!?;；:："'"'()（）【】\[\]《》""''/\\\-_+\n\r\t]+/).filter(w => w.length >= 2);
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

    const headers = ['提交时间', ...survey.questions.map(q => q.text)];
    const rows = responses.map(resp => {
      const date = new Date(resp.submittedAt).toLocaleString('zh-CN');
      const answers = survey.questions.map((_, qIndex) => {
        const answer = resp.answers[qIndex];
        if (Array.isArray(answer)) {
          return `"${answer.join('; ')}"`;
        }
        return answer ? `"${String(answer).replace(/"/g, '""')}"` : '';
      });
      return [date, ...answers];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${survey.title}.csv"`);
    res.send(bom + csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
