import express from 'express';
import type {
  Document,
  UserProgress,
  ParagraphProgress,
  ProgressUpload,
} from '../shared/types';

const app = express();
const PORT = 3002;

app.use(express.json());

const documents: Document[] = [
  {
    id: 'doc-001',
    title: '教育的意义',
    paragraphs: [
      '教育是人类文明传承的重要方式，它不仅传授知识，更培养人的思维能力和品格。在现代社会，教育已经成为每个人成长过程中不可或缺的组成部分，为个人的发展奠定坚实的基础。',
      '真正的教育不应该只是灌输现成的答案，而应该引导学生学会独立思考。教师的角色从知识的传递者转变为学习的引导者，帮助学生发现问题、分析问题、解决问题，培养他们的批判性思维和创新能力。',
      '教育的价值还在于塑造健全的人格。通过学习文学、历史、哲学等人文学科，学生能够理解人类的情感与智慧，培养同理心和道德感，成为有责任感、有担当的社会公民。',
      '在数字化时代，教育的形式正在发生深刻变化。在线学习平台、人工智能辅助教学等新技术为教育带来了更多可能性，让优质教育资源能够跨越时空的限制，惠及更多学习者。',
      '然而，无论技术如何进步，教育的核心始终是人对人的启发和引导。师生之间的真诚交流、同学之间的相互切磋，仍然是教育中最宝贵的部分。我们需要在创新中坚守教育的本质。',
    ],
  },
  {
    id: 'doc-002',
    title: '阅读与成长',
    paragraphs: [
      '阅读是获取知识最便捷的途径之一。一本好书就像一位良师益友，能够带领我们穿越时空，与历史上最伟大的思想家对话，了解不同的文化和生活方式。',
      '深度阅读能够锻炼我们的专注力和理解力。在这个信息碎片化的时代，能够静下心来读完一本完整的书，本身就是一种宝贵的能力。持续的阅读习惯会潜移默化地提升我们的思维深度。',
      '每个人都应该找到适合自己的阅读方式。有人喜欢精读，仔细品味每一句话；有人喜欢泛读，广泛涉猎各种主题。无论哪种方式，关键在于保持对知识的好奇心和探索欲。',
      '阅读不仅仅是为了获取信息，更是为了激发思考。好的作品会提出问题而非简单地给出答案，促使读者结合自身经历进行反思，形成独立的见解和判断。',
    ],
  },
];

const progressStore: Map<string, Map<string, UserProgress>> = new Map();

app.get('/api/documents', (req, res) => {
  res.json(documents);
});

app.post('/api/progress', (req, res) => {
  const { userId, documentId, paragraphIndex, readingTime } = req.body as ProgressUpload;

  if (!userId || !documentId || paragraphIndex === undefined || readingTime === undefined) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  if (!progressStore.has(userId)) {
    progressStore.set(userId, new Map());
  }

  const userDocs = progressStore.get(userId)!;

  if (!userDocs.has(documentId)) {
    userDocs.set(documentId, {
      userId,
      documentId,
      currentParagraph: paragraphIndex,
      paragraphs: [],
    });
  }

  const progress = userDocs.get(documentId)!;
  progress.currentParagraph = paragraphIndex;

  const existingPara = progress.paragraphs.find(
    (p) => p.paragraphIndex === paragraphIndex
  );

  if (existingPara) {
    existingPara.totalReadingTime += readingTime;
    existingPara.readCount += 1;
    existingPara.lastReadAt = Date.now();
  } else {
    const newPara: ParagraphProgress = {
      paragraphIndex,
      totalReadingTime: readingTime,
      readCount: 1,
      lastReadAt: Date.now(),
    };
    progress.paragraphs.push(newPara);
  }

  res.json({ success: true, progress });
});

app.get('/api/progress/:userId', (req, res) => {
  const { userId } = req.params;
  const userDocs = progressStore.get(userId);

  if (!userDocs) {
    res.json([]);
    return;
  }

  const progressList: UserProgress[] = Array.from(userDocs.values());
  res.json(progressList);
});

app.listen(PORT, () => {
  console.log(`Reading tracker server running on http://localhost:${PORT}`);
});
