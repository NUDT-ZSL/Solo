const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/gifs', express.static(path.join(__dirname, 'gifs')));

const exerciseLibrary = [
  {
    id: 'ex-001',
    name: '杠铃卧推 / Barbell Bench Press',
    targetMuscle: 'chest',
    category: 'compound',
    gifUrl: '/gifs/ex-001.gif',
    description: '平躺于卧推凳上，双手握杠铃与肩同宽，将杠铃从胸部上方推起至手臂伸直。',
  },
  {
    id: 'ex-002',
    name: '上斜哑铃卧推 / Incline Dumbbell Press',
    targetMuscle: 'chest',
    category: 'compound',
    gifUrl: '/gifs/ex-002.gif',
    description: '调节凳子至30-45度上斜角，双手持哑铃从胸部两侧推起至手臂伸直，重点刺激上胸。',
  },
  {
    id: 'ex-003',
    name: '绳索夹胸 / Cable Fly',
    targetMuscle: 'chest',
    category: 'isolation',
    gifUrl: '/gifs/ex-003.gif',
    description: '站于绳索滑轮之间，双臂从两侧向中间夹拢，感受胸肌收缩。',
  },
  {
    id: 'ex-004',
    name: '俯卧撑 / Push-ups',
    targetMuscle: 'chest',
    category: 'compound',
    gifUrl: '/gifs/ex-004.gif',
    description: '双手撑地与肩同宽，身体保持挺直，屈臂下降至胸部接近地面后推起。',
  },
  {
    id: 'ex-031',
    name: '哑铃飞鸟 / Dumbbell Fly',
    targetMuscle: 'chest',
    category: 'isolation',
    gifUrl: '/gifs/ex-031.gif',
    description: '平躺于凳上，双手持哑铃微屈臂从两侧向中间合拢，感受胸肌拉伸与收缩。',
  },
  {
    id: 'ex-012',
    name: '高位下拉 / Lat Pulldown',
    targetMuscle: 'back',
    category: 'compound',
    gifUrl: '/gifs/ex-012.gif',
    description: '坐姿双手宽握把手，将把手下拉至锁骨高度，感受背阔肌收缩。',
  },
  {
    id: 'ex-013',
    name: '杠铃划船 / Barbell Row',
    targetMuscle: 'back',
    category: 'compound',
    gifUrl: '/gifs/ex-013.gif',
    description: '俯身约45度，双手握杠铃将其拉向腹部，肘部尽量向后收。',
  },
  {
    id: 'ex-014',
    name: '坐姿绳索划船 / Seated Cable Row',
    targetMuscle: 'back',
    category: 'compound',
    gifUrl: '/gifs/ex-014.gif',
    description: '坐姿面对绳索滑轮，双手拉把手至腹部，挺胸收肩，锻炼中背部。',
  },
  {
    id: 'ex-015',
    name: '引体向上 / Pull-ups',
    targetMuscle: 'back',
    category: 'compound',
    gifUrl: '/gifs/ex-015.gif',
    description: '双手宽握单杠悬垂，将身体拉起至下巴过杠，重点锻炼背阔肌。',
  },
  {
    id: 'ex-016',
    name: '硬拉 / Deadlift',
    targetMuscle: 'back',
    category: 'compound',
    gifUrl: '/gifs/ex-016.gif',
    description: '双脚与肩同宽站立，俯身握杠铃，保持背部挺直将杠铃从地面拉起至站直。',
  },
  {
    id: 'ex-005',
    name: '杠铃推举 / Overhead Press',
    targetMuscle: 'shoulders',
    category: 'compound',
    gifUrl: '/gifs/ex-005.gif',
    description: '站姿或坐姿，双手握杠铃于肩部前方，将杠铃推举过头顶至手臂伸直。',
  },
  {
    id: 'ex-006',
    name: '侧平举 / Lateral Raise',
    targetMuscle: 'shoulders',
    category: 'isolation',
    gifUrl: '/gifs/ex-006.gif',
    description: '双手持哑铃于身体两侧，手臂微屈向两侧抬举至肩部高度，刺激三角肌中束。',
  },
  {
    id: 'ex-007',
    name: '面拉 / Face Pull',
    targetMuscle: 'shoulders',
    category: 'isolation',
    gifUrl: '/gifs/ex-007.gif',
    description: '使用绳索附件置于面部高度，双手拉向面部两侧，外旋手臂，锻炼后束及上背。',
  },
  {
    id: 'ex-032',
    name: '阿诺德推举 / Arnold Press',
    targetMuscle: 'shoulders',
    category: 'compound',
    gifUrl: '/gifs/ex-032.gif',
    description: '坐姿双手持哑铃于肩前掌心朝己，推举过头顶同时旋转手臂至掌心朝前。',
  },
  {
    id: 'ex-008',
    name: '杠铃弯举 / Barbell Curl',
    targetMuscle: 'biceps',
    category: 'isolation',
    gifUrl: '/gifs/ex-008.gif',
    description: '站姿双手握杠铃，肘部贴紧身体，弯曲手臂将杠铃举至肩部前方。',
  },
  {
    id: 'ex-009',
    name: '锤式弯举 / Hammer Curl',
    targetMuscle: 'biceps',
    category: 'isolation',
    gifUrl: '/gifs/ex-009.gif',
    description: '双手持哑铃掌心相对（锤式握法），弯曲手臂举至肩部，同时刺激肱肌和肱桡肌。',
  },
  {
    id: 'ex-033',
    name: '集中弯举 / Concentration Curl',
    targetMuscle: 'biceps',
    category: 'isolation',
    gifUrl: '/gifs/ex-033.gif',
    description: '坐姿单手持哑铃，肘部抵于大腿内侧，弯举至肩部前方，专注肱二头肌收缩。',
  },
  {
    id: 'ex-010',
    name: '三头肌下压 / Tricep Pushdown',
    targetMuscle: 'triceps',
    category: 'isolation',
    gifUrl: '/gifs/ex-010.gif',
    description: '使用绳索高位滑轮，肘部固定贴紧身体，将把手向下压至手臂伸直。',
  },
  {
    id: 'ex-011',
    name: '仰卧臂屈伸 / Skull Crusher',
    targetMuscle: 'triceps',
    category: 'isolation',
    gifUrl: '/gifs/ex-011.gif',
    description: '平躺于凳上，双手握EZ杆或哑铃，从额头上方屈臂下放再伸直手臂。',
  },
  {
    id: 'ex-034',
    name: '窄距卧推 / Close-Grip Bench Press',
    targetMuscle: 'triceps',
    category: 'compound',
    gifUrl: '/gifs/ex-034.gif',
    description: '与卧推姿势相同但双手窄握杠铃，重点刺激肱三头肌及内侧胸肌。',
  },
  {
    id: 'ex-017',
    name: '深蹲 / Squat',
    targetMuscle: 'legs',
    category: 'compound',
    gifUrl: '/gifs/ex-017.gif',
    description: '杠铃置于上背，双脚与肩同宽，屈髋屈膝下蹲至大腿平行地面后站起。',
  },
  {
    id: 'ex-018',
    name: '腿举 / Leg Press',
    targetMuscle: 'legs',
    category: 'compound',
    gifUrl: '/gifs/ex-018.gif',
    description: '坐于腿举机上，双脚踩踏板与肩同宽，屈膝下放后蹬起至腿部伸直。',
  },
  {
    id: 'ex-019',
    name: '腿弯举 / Leg Curl',
    targetMuscle: 'legs',
    category: 'isolation',
    gifUrl: '/gifs/ex-019.gif',
    description: '俯卧或坐于腿弯举机上，将配重片通过弯曲膝盖拉起，锻炼腘绳肌。',
  },
  {
    id: 'ex-020',
    name: '腿屈伸 / Leg Extension',
    targetMuscle: 'legs',
    category: 'isolation',
    gifUrl: '/gifs/ex-020.gif',
    description: '坐于腿屈伸机上，小腿前侧发力将配重片伸直，锻炼股四头肌。',
  },
  {
    id: 'ex-021',
    name: '提踵 / Calf Raise',
    targetMuscle: 'legs',
    category: 'isolation',
    gifUrl: '/gifs/ex-021.gif',
    description: '站于提踵机或台阶边缘，脚跟下放后踮脚尖站起，锻炼小腿腓肠肌。',
  },
  {
    id: 'ex-022',
    name: '弓步蹲 / Lunges',
    targetMuscle: 'legs',
    category: 'compound',
    gifUrl: '/gifs/ex-022.gif',
    description: '一脚向前跨出一大步，屈膝下蹲至后膝接近地面后推回起始位，交替进行。',
  },
  {
    id: 'ex-027',
    name: '臀推 / Hip Thrust',
    targetMuscle: 'glutes',
    category: 'compound',
    gifUrl: '/gifs/ex-027.gif',
    description: '上背靠于凳上，杠铃置于髋部，臀部发力将髋部推至与身体成直线。',
  },
  {
    id: 'ex-028',
    name: '臀桥 / Glute Bridge',
    targetMuscle: 'glutes',
    category: 'isolation',
    gifUrl: '/gifs/ex-028.gif',
    description: '仰卧屈膝，双脚踩地，臀部发力将骨盆抬起至肩、髋、膝成一线。',
  },
  {
    id: 'ex-029',
    name: '绳索后踢腿 / Cable Kickback',
    targetMuscle: 'glutes',
    category: 'isolation',
    gifUrl: '/gifs/ex-029.gif',
    description: '将绳索固定于脚踝，站姿单腿向后上方踢出，感受臀大肌收缩。',
  },
  {
    id: 'ex-023',
    name: '平板支撑 / Plank',
    targetMuscle: 'core',
    category: 'isolation',
    gifUrl: '/gifs/ex-023.gif',
    description: '前臂和脚尖撑地，身体保持一条直线，保持核心收紧不动。',
  },
  {
    id: 'ex-024',
    name: '俄罗斯转体 / Russian Twist',
    targetMuscle: 'core',
    category: 'isolation',
    gifUrl: '/gifs/ex-024.gif',
    description: '坐姿身体后倾，双脚离地或着地，双手持重物左右旋转，锻炼腹斜肌。',
  },
  {
    id: 'ex-025',
    name: '悬垂举腿 / Hanging Leg Raise',
    targetMuscle: 'core',
    category: 'isolation',
    gifUrl: '/gifs/ex-025.gif',
    description: '双手悬垂于单杠，直腿或屈腿将双腿抬至水平或更高，锻炼下腹。',
  },
  {
    id: 'ex-026',
    name: '腹肌轮 / Ab Wheel',
    targetMuscle: 'core',
    category: 'compound',
    gifUrl: '/gifs/ex-026.gif',
    description: '跪姿双手持腹肌轮向前滚动至身体接近水平，再用腹部力量拉回。',
  },
  {
    id: 'ex-030',
    name: "农夫行走 / Farmer's Walk",
    targetMuscle: 'core',
    category: 'compound',
    gifUrl: '/gifs/ex-030.gif',
    description: '双手各持重物自然垂于身体两侧，挺胸收腹行走，锻炼握力与核心稳定。',
  },
];

const trainingHistory = [];

const splitSchedules = {
  3: [
    { label: '推力日', muscleGroups: ['chest', 'shoulders', 'triceps'] },
    { label: '拉力日', muscleGroups: ['back', 'biceps'] },
    { label: '腿部日', muscleGroups: ['legs', 'glutes', 'core'] },
  ],
  4: [
    { label: '上肢日', muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
    { label: '下肢日', muscleGroups: ['legs', 'glutes', 'core'] },
    { label: '上肢日', muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
    { label: '下肢日', muscleGroups: ['legs', 'glutes', 'core'] },
  ],
  5: [
    { label: '胸+三头日', muscleGroups: ['chest', 'triceps'] },
    { label: '背+二头日', muscleGroups: ['back', 'biceps'] },
    { label: '肩+核心日', muscleGroups: ['shoulders', 'core'] },
    { label: '腿部日', muscleGroups: ['legs', 'glutes'] },
    { label: '全身轻训日', muscleGroups: ['chest', 'back', 'legs', 'core'] },
  ],
  6: [
    { label: '胸部日', muscleGroups: ['chest'] },
    { label: '背部日', muscleGroups: ['back'] },
    { label: '肩部日', muscleGroups: ['shoulders'] },
    { label: '手臂日', muscleGroups: ['biceps', 'triceps'] },
    { label: '腿部日', muscleGroups: ['legs', 'glutes'] },
    { label: '核心+有氧日', muscleGroups: ['core'] },
  ],
};

const levelConfigs = {
  beginner: {
    exerciseRange: [3, 4],
    setRange: [3, 3],
    repRange: [10, 12],
    restRange: [90, 90],
    compoundFirst: true,
  },
  intermediate: {
    exerciseRange: [4, 6],
    setRange: [3, 4],
    repRange: [8, 12],
    restRange: [60, 90],
    compoundFirst: false,
  },
  advanced: {
    exerciseRange: [5, 7],
    setRange: [4, 5],
    repRange: [6, 12],
    restRange: [45, 60],
    compoundFirst: false,
  },
};

const goalConfigs = {
  muscle_gain: {
    restRange: [60, 90],
    setAdjust: 1,
    repRange: [8, 12],
    compoundFirst: null,
  },
  fat_loss: {
    restRange: [30, 60],
    setAdjust: 0,
    repRange: [12, 15],
    compoundFirst: true,
  },
  strength: {
    restRange: [120, 180],
    setAdjust: -1,
    repRange: [3, 6],
    compoundFirst: true,
  },
};

function midOf(range) {
  return Math.round((range[0] + range[1]) / 2);
}

function selectExercises(muscleGroups, count, compoundFirst) {
  const sorted = new Map();

  for (const mg of muscleGroups) {
    const group = exerciseLibrary
      .filter((e) => e.targetMuscle === mg)
      .sort((a, b) => {
        if (compoundFirst) {
          return (a.category === 'compound' ? 0 : 1) - (b.category === 'compound' ? 0 : 1);
        }
        return 0;
      });
    sorted.set(mg, group);
  }

  const selected = [];
  const usedIds = new Set();
  const pickIndices = new Map();
  for (const mg of muscleGroups) pickIndices.set(mg, 0);

  while (selected.length < count) {
    let added = false;
    for (const mg of muscleGroups) {
      if (selected.length >= count) break;
      const group = sorted.get(mg);
      const startIdx = pickIndices.get(mg);
      for (let i = startIdx; i < group.length; i++) {
        if (!usedIds.has(group[i].id)) {
          selected.push(group[i]);
          usedIds.add(group[i].id);
          pickIndices.set(mg, i + 1);
          added = true;
          break;
        }
      }
    }
    if (!added) break;
  }

  return selected;
}

app.get('/api/actions', (req, res) => {
  res.json(exerciseLibrary);
});

app.post('/api/training/save', (req, res) => {
  const session = req.body;
  if (!session.id) {
    session.id = uuidv4();
  }
  if (!session.completedAt) {
    session.completedAt = new Date().toISOString();
  }
  trainingHistory.push(session);
  res.json({ success: true, id: session.id });
});

app.get('/api/history', (req, res) => {
  let result = [...trainingHistory];

  const days = parseInt(req.query.days, 10);
  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    result = result.filter((s) => new Date(s.completedAt) >= cutoff);
  }

  result.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  res.json(result);
});

app.post('/api/plan/generate', (req, res) => {
  const { level, goal, daysPerWeek } = req.body;

  const schedule = splitSchedules[daysPerWeek];
  if (!schedule) {
    return res.status(400).json({ error: `Unsupported daysPerWeek: ${daysPerWeek}` });
  }

  const levelConfig = levelConfigs[level];
  const goalConfig = goalConfigs[goal];

  if (!levelConfig) {
    return res.status(400).json({ error: `Unsupported level: ${level}` });
  }
  if (!goalConfig) {
    return res.status(400).json({ error: `Unsupported goal: ${goal}` });
  }

  const numExercises = midOf(levelConfig.exerciseRange);
  const baseSets = midOf(levelConfig.setRange) + goalConfig.setAdjust;
  const reps = midOf(goalConfig.repRange);
  const rest = midOf(goalConfig.restRange);
  const compoundFirst = goalConfig.compoundFirst ?? levelConfig.compoundFirst;
  const finalSets = Math.max(1, baseSets);

  const plan = schedule.map((split, index) => {
    const selected = selectExercises(split.muscleGroups, numExercises, compoundFirst);

    const exercises = selected.map((e) => ({
      id: e.id,
      name: e.name,
      targetMuscle: e.targetMuscle,
      category: e.category,
      gifUrl: e.gifUrl,
      description: e.description,
      sets: finalSets,
      reps,
      restSeconds: rest,
    }));

    const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
    const estimatedDuration = Math.round((totalSets * (rest + 45)) / 60);

    return {
      day: index + 1,
      label: split.label,
      exercises,
      estimatedDuration,
      totalSets,
    };
  });

  res.json(plan);
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
