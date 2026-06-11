const POSITIVE_STRONG = ['爱', '深爱', '热爱', '狂喜', '幸福', '完美', '精彩', '伟大', '太棒了', '最美'];
const POSITIVE_MEDIUM = ['喜欢', '开心', '快乐', '高兴', '愉快', '温柔', '温暖', '美好', '希望', '勇敢', '光明', '善良', '真诚'];
const POSITIVE_WEAK = ['笑', '微笑', '不错', '挺好', '还行', '舒服', '轻松', '平静', '安宁', '和谐', '灯', '星', '暖'];

const NEGATIVE_STRONG = ['恨', '痛恨', '仇恨', '痛苦', '绝望', '死亡', '杀戮', '毁灭', '恐怖', '噩梦', '残忍', '恶毒'];
const NEGATIVE_MEDIUM = ['悲伤', '难过', '愤怒', '害怕', '恐惧', '危险', '伤害', '疼痛', '哭泣', '流泪', '黑暗', '冰冷', '威胁'];
const NEGATIVE_WEAK = ['痛', '冷', '黑', '忧愁', '烦恼', '焦虑', '担心', '不安', '紧张', '疲惫', '伤', '血', '沙哑'];

const NEGATION_WORDS = ['不', '没', '无', '非', '否', '别', '莫'];

function calcSentiment(text) {
  let total = 0;
  let wordCount = 0;

  const allPositive = [
    ...POSITIVE_STRONG.map((w) => ({ word: w, score: 0.7 })),
    ...POSITIVE_MEDIUM.map((w) => ({ word: w, score: 0.4 })),
    ...POSITIVE_WEAK.map((w) => ({ word: w, score: 0.2 })),
  ];
  const allNegative = [
    ...NEGATIVE_STRONG.map((w) => ({ word: w, score: -0.7 })),
    ...NEGATIVE_MEDIUM.map((w) => ({ word: w, score: -0.4 })),
    ...NEGATIVE_WEAK.map((w) => ({ word: w, score: -0.2 })),
  ];

  const found = [];

  allPositive.forEach(({ word, score }) => {
    let idx = text.indexOf(word);
    while (idx !== -1) {
      found.push({ pos: idx, score, len: word.length });
      idx = text.indexOf(word, idx + 1);
    }
  });

  allNegative.forEach(({ word, score }) => {
    let idx = text.indexOf(word);
    while (idx !== -1) {
      found.push({ pos: idx, score, len: word.length });
      idx = text.indexOf(word, idx + 1);
    }
  });

  found.sort((a, b) => a.pos - b.pos);

  const negationPositions = [];
  NEGATION_WORDS.forEach((neg) => {
    let idx = text.indexOf(neg);
    while (idx !== -1) {
      negationPositions.push(idx);
      idx = text.indexOf(neg, idx + 1);
    }
  });
  negationPositions.sort((a, b) => a - b);

  const used = new Set();
  found.forEach((item) => {
    if (used.has(item.pos)) return;
    for (let i = item.pos; i < item.pos + item.len; i++) {
      if (used.has(i)) return;
    }
    for (let i = item.pos; i < item.pos + item.len; i++) {
      used.add(i);
    }

    let score = item.score;

    for (const negPos of negationPositions) {
      if (negPos < item.pos && item.pos - negPos <= 6) {
        score = -score;
        break;
      }
    }

    total += score;
    wordCount++;
  });

  if (wordCount === 0) return 0;

  const avg = total / Math.sqrt(wordCount);
  return Math.max(-1, Math.min(1, avg));
}

console.log('=== 情感分析测试 ===');

const testCases = [
  '林川很开心，他喜欢这个地方。',
  '苏雨不太高兴。',
  '这个地方很美好，让人感觉温暖。',
  '他的心中充满了仇恨和痛苦。',
  '不快乐',
  '没什么好担心的',
];

testCases.forEach((text) => {
  const score = calcSentiment(text);
  console.log(`"${text}" => ${score.toFixed(3)}`);
});

console.log('\n=== 冲突检测测试 ===');

const OPPOSITION_VERBS = ['拒绝', '反对', '挡', '躲', '追', '打', '刺', '砸', '挣扎', '反抗', '抵抗', '对抗', '拦住', '推开', '甩开', '怒斥', '指责', '威胁', '攻击', '反击'];
const TRANSITION_WORDS = ['但是', '然而', '可是', '不过', '却', '偏偏', '竟然', '居然', '不料', '谁知', '反倒'];
const NEGATIVE_INTENT = ['不想', '不愿', '不肯', '不要', '不行', '不准', '不许', '不能', '不会', '不可能'];
const CHARACTER_GOALS = {
  林川: ['寻找', '追查', '找到', '真相', '日记', '父亲', '失踪', '回来', '面对'],
  苏雨: ['帮助', '保护', '告诉', '隐瞒', '秘密', '担心', '关心'],
  陈默: ['威胁', '阻止', '消失', '隐藏', '灭口', '真相', '掩盖', '害怕'],
};
const DEFAULT_CHARACTERS = ['林川', '苏雨', '陈默'];

function extractDialogues(text) {
  const dialogues = [];
  const regex = /"([^"]+)"/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    dialogues.push(match[1]);
  }
  return dialogues;
}

function hasOppositeIntent(dialogue) {
  let hasOpposite = false;
  NEGATIVE_INTENT.forEach((w) => {
    if (dialogue.includes(w)) hasOpposite = true;
  });
  TRANSITION_WORDS.forEach((w) => {
    if (dialogue.includes(w)) hasOpposite = true;
  });
  return hasOpposite;
}

function findCharactersInText(text, charList) {
  const found = [];
  charList.forEach((c) => {
    if (text.includes(c) && !found.includes(c)) {
      found.push(c);
    }
  });
  return found;
}

function calcConflictScore(para, charsInPara) {
  let score = 0;
  let reasonParts = [];

  let oppositionCount = 0;
  OPPOSITION_VERBS.forEach((w) => {
    if (para.includes(w)) oppositionCount++;
  });
  if (oppositionCount > 0) {
    score += oppositionCount * 2;
    reasonParts.push(`存在对立动作词（${OPPOSITION_VERBS.filter((w) => para.includes(w)).slice(0, 3).join('、')}）`);
  }

  let transitionCount = 0;
  TRANSITION_WORDS.forEach((w) => {
    if (para.includes(w)) transitionCount++;
  });
  if (transitionCount > 0) {
    score += transitionCount * 1.5;
    reasonParts.push('有转折关系词暗示冲突');
  }

  const dialogues = extractDialogues(para);
  let dialogueConflict = 0;
  dialogues.forEach((d) => {
    if (hasOppositeIntent(d)) dialogueConflict++;
  });
  if (dialogueConflict > 0) {
    score += dialogueConflict * 2.5;
    reasonParts.push('对话中存在相反意图表达');
  }

  if (charsInPara.length >= 2) {
    score += 1;

    let goalConflict = 0;
    for (let i = 0; i < charsInPara.length; i++) {
      for (let j = i + 1; j < charsInPara.length; j++) {
        const goals1 = CHARACTER_GOALS[charsInPara[i]] || [];
        const goals2 = CHARACTER_GOALS[charsInPara[j]] || [];
        const has1 = goals1.some((g) => para.includes(g));
        const has2 = goals2.some((g) => para.includes(g));
        if (has1 && has2) {
          goalConflict++;
        }
      }
    }
    if (goalConflict > 0) {
      score += goalConflict * 2;
      reasonParts.push('角色目标关键词呈现对立关系');
    }
  }

  if (reasonParts.length === 0) {
    reasonParts.push('检测到潜在情节冲突');
  }

  return { score, reason: reasonParts.join('；') };
}

const conflictTestCases = [
  '林川想寻找真相，但苏雨却阻止他。',
  '"我不要去！"林川拒绝了苏雨的提议。',
  '林川和苏雨一起散步，聊得很开心。',
  '陈默威胁林川，让他不要追查真相。',
];

conflictTestCases.forEach((para) => {
  const chars = findCharactersInText(para, DEFAULT_CHARACTERS);
  const { score, reason } = calcConflictScore(para, chars);
  console.log(`"${para}"`);
  console.log(`  角色: ${chars.join(', ')}, 冲突分数: ${score}, 原因: ${reason}`);
  console.log();
});

console.log('=== 角色共现测试（按句子） ===');

function calcCharCooccurrence(content, characters) {
  const linkStrength = {};
  const sentences = content.split(/[。！？!?\n]+/g).filter((s) => s.trim().length > 0);

  sentences.forEach((sentence) => {
    const present = [];
    characters.forEach((c) => {
      if (sentence.includes(c.name)) present.push(c.id);
    });
    for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        const key = [present[i], present[j]].sort().join('|');
        linkStrength[key] = (linkStrength[key] || 0) + 1;
      }
    }
  });

  return linkStrength;
}

const testContent = `林川和苏雨在咖啡馆见面。林川告诉苏雨他想寻找父亲的日记。
苏雨很担心林川的安全。陈默在暗处监视着他们。
林川和苏雨一起去了河边。他们在河边发现了一些线索。`;

const testChars = [
  { id: 'char1', name: '林川' },
  { id: 'char2', name: '苏雨' },
  { id: 'char3', name: '陈默' },
];

const cooccurrence = calcCharCooccurrence(testContent, testChars);
console.log('共现统计:', cooccurrence);
