import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type {
  Survey,
  SurveyComponent,
  SurveyResponse,
  Answer,
  AggregatedData,
  HourlyResponse
} from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const surveys: Survey[] = [];
const responses: SurveyResponse[] = [];

const generateSurveyCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const getDefaultLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    radio: '请选择一个选项',
    checkbox: '请选择多个选项',
    rating: '请您为我们的服务打分',
    text: '请输入您的意见',
    select: '请从下拉列表中选择'
  };
  return labels[type] || '请填写';
};

const getDefaultOptions = (type: string): string[] | undefined => {
  if (type === 'radio' || type === 'checkbox') {
    return ['选项A', '选项B', '选项C'];
  }
  if (type === 'select') {
    return ['选项一', '选项二', '选项三', '选项四'];
  }
  return undefined;
};

app.post('/api/surveys', (req, res) => {
  const { title, components }: { title: string; components: SurveyComponent[] } = req.body;
  
  const survey: Survey = {
    id: uuidv4(),
    code: generateSurveyCode(),
    title: title || '未命名问卷',
    components,
    createdAt: new Date().toISOString()
  };
  
  surveys.push(survey);
  res.status(201).json({ id: survey.id, code: survey.code });
});

app.get('/api/surveys', (req, res) => {
  res.json(surveys);
});

app.get('/api/surveys/:id', (req, res) => {
  const survey = surveys.find(s => s.id === req.params.id);
  if (!survey) {
    return res.status(404).json({ error: '问卷不存在' });
  }
  res.json(survey);
});

app.post('/api/responses', (req, res) => {
  const { surveyId, answers }: { surveyId: string; answers: Answer[] } = req.body;
  
  const survey = surveys.find(s => s.id === surveyId);
  if (!survey) {
    return res.status(404).json({ error: '问卷不存在' });
  }
  
  const response: SurveyResponse = {
    id: uuidv4(),
    surveyId,
    answers,
    submittedAt: new Date().toISOString()
  };
  
  responses.push(response);
  res.status(201).json({ id: response.id });
});

app.get('/api/surveys/:id/responses', (req, res) => {
  const surveyResponses = responses.filter(r => r.surveyId === req.params.id);
  res.json(surveyResponses);
});

app.get('/api/surveys/:id/responses/aggregate', (req, res) => {
  const survey = surveys.find(s => s.id === req.params.id);
  if (!survey) {
    return res.status(404).json({ error: '问卷不存在' });
  }
  
  const surveyResponses = responses.filter(r => r.surveyId === req.params.id);
  
  const aggregated: AggregatedData[] = survey.components.map(component => {
    const result: AggregatedData = {
      componentId: component.id,
      type: component.type,
      label: component.label
    };
    
    const componentAnswers = surveyResponses
      .map(r => r.answers.find(a => a.componentId === component.id))
      .filter(Boolean) as Answer[];
    
    if (component.type === 'radio' || component.type === 'select') {
      const optionCounts: { [key: string]: number } = {};
      (component.options || []).forEach(opt => {
        optionCounts[opt] = 0;
      });
      componentAnswers.forEach(answer => {
        const val = answer.value as string;
        if (optionCounts.hasOwnProperty(val)) {
          optionCounts[val]++;
        }
      });
      result.optionCounts = optionCounts;
    }
    
    if (component.type === 'checkbox') {
      const optionCounts: { [key: string]: number } = {};
      (component.options || []).forEach(opt => {
        optionCounts[opt] = 0;
      });
      componentAnswers.forEach(answer => {
        const vals = answer.value as string[];
        vals.forEach(val => {
          if (optionCounts.hasOwnProperty(val)) {
            optionCounts[val]++;
          }
        });
      });
      result.optionCounts = optionCounts;
    }
    
    if (component.type === 'rating') {
      const distribution: { [score: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      componentAnswers.forEach(answer => {
        const val = answer.value as number;
        if (val >= 1 && val <= 5) {
          distribution[val]++;
          sum += val;
        }
      });
      const count = componentAnswers.length;
      result.ratingStats = {
        average: count > 0 ? Number((sum / count).toFixed(2)) : 0,
        distribution
      };
    }
    
    if (component.type === 'text') {
      result.textAnswers = componentAnswers.map(a => a.value as string);
    }
    
    return result;
  });
  
  res.json(aggregated);
});

app.get('/api/surveys/:id/responses/hourly', (req, res) => {
  const surveyResponses = responses.filter(r => r.surveyId === req.params.id);
  
  const hourlyMap: { [key: string]: number } = {};
  
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0') + ':00';
    hourlyMap[hour] = 0;
  }
  
  surveyResponses.forEach(response => {
    const date = new Date(response.submittedAt);
    const hour = date.getHours().toString().padStart(2, '0') + ':00';
    if (hourlyMap.hasOwnProperty(hour)) {
      hourlyMap[hour]++;
    }
  });
  
  const hourlyData: HourlyResponse[] = Object.entries(hourlyMap)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));
  
  res.json(hourlyData);
});

app.post('/api/surveys/demo', (req, res) => {
  const demoComponents: SurveyComponent[] = [
    {
      id: 'demo-1',
      type: 'radio',
      label: '您的性别是？',
      options: ['男', '女', '其他']
    },
    {
      id: 'demo-2',
      type: 'checkbox',
      label: '您通过哪些渠道了解我们？',
      options: ['社交媒体', '朋友推荐', '搜索引擎', '广告']
    },
    {
      id: 'demo-3',
      type: 'rating',
      label: '请为我们的服务打分'
    },
    {
      id: 'demo-4',
      type: 'text',
      label: '您有什么建议？'
    },
    {
      id: 'demo-5',
      type: 'select',
      label: '您的年龄段是？',
      options: ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '45岁以上']
    }
  ];
  
  const survey: Survey = {
    id: 'demo-survey',
    code: 'DEMO12',
    title: '用户满意度调查问卷',
    components: demoComponents,
    createdAt: new Date().toISOString()
  };
  
  const existingIndex = surveys.findIndex(s => s.id === 'demo-survey');
  if (existingIndex >= 0) {
    surveys[existingIndex] = survey;
  } else {
    surveys.push(survey);
  }
  
  const demoResponses: SurveyResponse[] = [];
  for (let i = 0; i < 50; i++) {
    const hour = Math.floor(Math.random() * 24);
    const responseDate = new Date();
    responseDate.setHours(hour, Math.floor(Math.random() * 60));
    
    const answers: Answer[] = [
      {
        componentId: 'demo-1',
        value: ['男', '女', '其他'][Math.floor(Math.random() * 3)]
      },
      {
        componentId: 'demo-2',
        value: ['社交媒体', '朋友推荐', '搜索引擎', '广告'].filter(() => Math.random() > 0.5)
      },
      {
        componentId: 'demo-3',
        value: Math.floor(Math.random() * 5) + 1
      },
      {
        componentId: 'demo-4',
        value: `这是第${i + 1}条用户建议，内容非常有参考价值。`
      },
      {
        componentId: 'demo-5',
        value: ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '45岁以上'][Math.floor(Math.random() * 5)]
      }
    ];
    
    demoResponses.push({
      id: `demo-response-${i}`,
      surveyId: 'demo-survey',
      answers,
      submittedAt: responseDate.toISOString()
    });
  }
  
  const filteredResponses = responses.filter(r => r.surveyId !== 'demo-survey');
  responses.length = 0;
  responses.push(...filteredResponses, ...demoResponses);
  
  res.status(201).json({ survey, responsesCount: demoResponses.length });
});

app.listen(PORT, () => {
  console.log(`Survey API server running on http://localhost:${PORT}`);
});
