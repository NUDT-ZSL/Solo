"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mock_data_js_1 = require("./mock-data.js");
const app = (0, express_1.default)();
const PORT = 3002;
app.use(express_1.default.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS')
        return res.sendStatus(200);
    next();
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', ts: Date.now(), total: mock_data_js_1.QUESTION_BANK.length });
});
app.get('/api/tags', (req, res) => {
    const stats = mock_data_js_1.KNOWLEDGE_TAGS.map(tag => ({
        tag,
        total: mock_data_js_1.QUESTION_BANK.filter(q => q.knowledgeTag === tag).length,
        byDifficulty: {
            1: mock_data_js_1.QUESTION_BANK.filter(q => q.knowledgeTag === tag && q.difficulty === 1).length,
            2: mock_data_js_1.QUESTION_BANK.filter(q => q.knowledgeTag === tag && q.difficulty === 2).length,
            3: mock_data_js_1.QUESTION_BANK.filter(q => q.knowledgeTag === tag && q.difficulty === 3).length,
        },
    }));
    res.json({ tags: stats });
});
app.get('/api/questions', (req, res) => {
    const { tags, difficulties, limit, random, balanced } = req.query;
    try {
        const tagList = tags ? String(tags).split(',').filter(Boolean) : undefined;
        const diffList = difficulties
            ? String(difficulties).split(',').map(Number).filter(d => d === 1 || d === 2 || d === 3)
            : undefined;
        const lim = limit ? Number(limit) : undefined;
        const isRandom = random === 'true' || random === '1';
        let result;
        if (balanced === 'true' || balanced === '1') {
            const count = lim || 10;
            result = (0, mock_data_js_1.getBalancedQuestions)(count);
        }
        else {
            result = (0, mock_data_js_1.getQuestionsByFilter)({
                tags: tagList,
                difficulties: diffList,
                limit: lim,
                random: isRandom,
            });
        }
        res.json({
            count: result.length,
            questions: result.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options,
                knowledgeTag: q.knowledgeTag,
                difficulty: q.difficulty,
            })),
        });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.post('/api/quiz/submit', (req, res) => {
    try {
        const { answers } = req.body;
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'answers数组必填' });
        }
        const results = [];
        let correctCount = 0;
        let totalTime = 0;
        const tagStats = {};
        answers.forEach(a => {
            const q = mock_data_js_1.QUESTION_BANK.find(q => q.id === a.questionId);
            if (!q)
                return;
            const correct = a.userAnswer === q.correctAnswer;
            if (correct)
                correctCount++;
            totalTime += a.timeSpent || 0;
            if (!tagStats[q.knowledgeTag])
                tagStats[q.knowledgeTag] = { total: 0, correct: 0 };
            tagStats[q.knowledgeTag].total++;
            if (correct)
                tagStats[q.knowledgeTag].correct++;
            results.push({
                questionId: q.id,
                correct,
                correctAnswer: q.correctAnswer,
                userAnswer: a.userAnswer,
                explanation: q.explanation,
                knowledgeTag: q.knowledgeTag,
                difficulty: q.difficulty,
            });
        });
        const byKnowledge = Object.entries(tagStats).map(([tag, s]) => ({
            tag,
            total: s.total,
            correct: s.correct,
            rate: s.total > 0 ? s.correct / s.total : 0,
        }));
        const byDifficulty = { 1: { total: 0, correct: 0, rate: 0 }, 2: { total: 0, correct: 0, rate: 0 }, 3: { total: 0, correct: 0, rate: 0 } };
        results.forEach(r => {
            const d = r.difficulty;
            byDifficulty[d].total++;
            if (r.correct)
                byDifficulty[d].correct++;
        });
        Object.keys(byDifficulty).forEach(k => {
            const key = Number(k);
            const v = byDifficulty[key];
            v.rate = v.total > 0 ? v.correct / v.total : 0;
        });
        const wrongIds = results.filter(r => !r.correct).map(r => r.questionId);
        const wrongQuestions = mock_data_js_1.QUESTION_BANK.filter(q => wrongIds.includes(q.id));
        res.json({
            total: answers.length,
            correctCount,
            accuracy: answers.length > 0 ? correctCount / answers.length : 0,
            totalTime,
            avgTimePerQuestion: answers.length > 0 ? totalTime / answers.length : 0,
            results,
            byKnowledge,
            byDifficulty,
            wrongQuestions,
            weakTags: byKnowledge
                .filter(s => s.rate < 0.6)
                .sort((a, b) => a.rate - b.rate)
                .map(s => s.tag),
            simulatedAvg: {
                overall: 0.68 + Math.random() * 0.08,
                byKnowledge: byKnowledge.map(s => ({
                    tag: s.tag,
                    rate: 0.55 + Math.random() * 0.3,
                })),
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/analysis/report', (req, res) => {
    try {
        const { history } = req.body;
        const sampleHistory = history && history.length ? history : [];
        const tagStats = {};
        sampleHistory.forEach(h => {
            const q = mock_data_js_1.QUESTION_BANK.find(q => q.id === h.questionId);
            if (!q)
                return;
            if (!tagStats[q.knowledgeTag])
                tagStats[q.knowledgeTag] = { total: 0, correct: 0, ids: [] };
            tagStats[q.knowledgeTag].total++;
            if (h.correct)
                tagStats[q.knowledgeTag].correct++;
            if (!h.correct)
                tagStats[q.knowledgeTag].ids.push(q.id);
        });
        if (!Object.keys(tagStats).length) {
            mock_data_js_1.KNOWLEDGE_TAGS.forEach(tag => {
                const total = 8 + Math.floor(Math.random() * 10);
                const correct = Math.floor(total * (0.3 + Math.random() * 0.7));
                tagStats[tag] = {
                    total,
                    correct,
                    ids: [],
                };
            });
        }
        const knowledgeAnalysis = Object.entries(tagStats).map(([tag, s]) => ({
            tag,
            total: s.total,
            correct: s.correct,
            rate: s.total > 0 ? s.correct / s.total : 0,
            level: s.total > 0 && s.correct / s.total < 0.4
                ? 'critical'
                : s.total > 0 && s.correct / s.total < 0.6
                    ? 'weak'
                    : s.total > 0 && s.correct / s.total < 0.8
                        ? 'medium'
                        : 'strong',
            suggestion: s.total > 0 && s.correct / s.total < 0.6
                ? `建议对"${tag}"进行专项练习`
                : s.total > 0 && s.correct / s.total < 0.8
                    ? `可适当复习"${tag}"相关知识点`
                    : `"${tag}"掌握良好，保持`,
        }));
        res.json({
            overall: {
                total: Object.values(tagStats).reduce((s, t) => s + t.total, 0),
                correct: Object.values(tagStats).reduce((s, t) => s + t.correct, 0),
                rate: Object.values(tagStats).reduce((s, t) => s + t.total, 0) > 0
                    ? Object.values(tagStats).reduce((s, t) => s + t.correct, 0) / Object.values(tagStats).reduce((s, t) => s + t.total, 0)
                    : 0,
            },
            knowledgeAnalysis,
            radarData: {
                user: knowledgeAnalysis.map(a => ({ tag: a.tag, value: a.rate })),
                average: knowledgeAnalysis.map(() => ({ value: 0.6 + Math.random() * 0.25 })),
            },
            suggestions: [
                '建议优先练习薄弱知识点，逐个突破',
                '答对的题目也建议定期复习巩固',
                '合理使用错题本功能，针对性练习',
                '注意限时训练，提高答题速度',
            ],
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.listen(PORT, () => {
    console.log(`[Quiz Server] 运行在 http://localhost:${PORT}`);
    console.log(`[Quiz Server] 题库总量: ${mock_data_js_1.QUESTION_BANK.length} 题`);
    console.log(`[Quiz Server] 知识点覆盖: ${mock_data_js_1.KNOWLEDGE_TAGS.length} 个`);
});
exports.default = app;
