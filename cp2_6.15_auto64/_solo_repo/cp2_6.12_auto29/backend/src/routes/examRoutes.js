const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const {
    notifyStudents,
    notifySubmissionConfirmed,
    notifyReviewAssigned,
    notifyTeacherReviewProgress
} = require('./socketHandlers');

const router = express.Router();

function parseJSONField(value, defaultValue = null) {
    if (!value) return defaultValue;
    try {
        return JSON.parse(value);
    } catch {
        return defaultValue;
    }
}

function stringifyJSONField(value) {
    if (value === undefined || value === null) return null;
    return JSON.stringify(value);
}

function calculateSubmissionAverageScore(submissionId) {
    const reviews = db.prepare(`
        SELECT scores FROM reviews WHERE submission_id = ? AND completed = 1
    `).all(submissionId);

    if (reviews.length === 0) return null;

    let totalScore = 0;
    let count = 0;

    for (const review of reviews) {
        const scores = parseJSONField(review.scores, {});
        for (const key in scores) {
            if (typeof scores[key] === 'number') {
                totalScore += scores[key];
                count++;
            }
        }
    }

    return count > 0 ? Math.round((totalScore / count) * 100) / 100 : null;
}

router.get('/questions', (req, res) => {
    const { page = 1, pageSize = 20, difficulty, knowledge_point } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let whereClause = [];
    let params = [];

    if (difficulty) {
        whereClause.push('difficulty = ?');
        params.push(difficulty);
    }
    if (knowledge_point) {
        whereClause.push('knowledge_point = ?');
        params.push(knowledge_point);
    }

    const whereSQL = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const countResult = db.prepare(`
        SELECT COUNT(*) as total FROM questions ${whereSQL}
    `).get(...params);

    const questions = db.prepare(`
        SELECT * FROM questions ${whereSQL}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);

    const formattedQuestions = questions.map(q => ({
        ...q,
        options: parseJSONField(q.options, []),
        correct_answers: parseJSONField(q.correct_answers, []),
        published: q.published === 1
    }));

    res.json({
        data: formattedQuestions,
        total: countResult.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
    });
});

router.post('/questions', (req, res) => {
    const { type, content, options, correct_answers, difficulty, knowledge_point, teacher_id } = req.body;

    if (!type || !content || !correct_answers || !difficulty || !knowledge_point || !teacher_id) {
        return res.status(400).json({ error: '缺少必填字段' });
    }

    if (!['single', 'multiple', 'essay'].includes(type)) {
        return res.status(400).json({ error: '题目类型无效' });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ error: '难度级别无效' });
    }

    if ((type === 'single' || type === 'multiple') && (!options || options.length < 2)) {
        return res.status(400).json({ error: '选择题至少需要2个选项' });
    }

    if (type === 'multiple' && (!correct_answers || correct_answers.length < 2)) {
        return res.status(400).json({ error: '多选题至少需要2个正确选项' });
    }

    const id = uuidv4();
    db.prepare(`
        INSERT INTO questions (id, type, content, options, correct_answers, difficulty, knowledge_point, teacher_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        type,
        content,
        stringifyJSONField(options),
        stringifyJSONField(correct_answers),
        difficulty,
        knowledge_point,
        teacher_id
    );

    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    res.json({
        ...question,
        options: parseJSONField(question.options, []),
        correct_answers: parseJSONField(question.correct_answers, [])
    });
});

router.put('/questions/:id', (req, res) => {
    const { id } = req.params;
    const { type, content, options, correct_answers, difficulty, knowledge_point } = req.body;

    const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    if (!existing) {
        return res.status(404).json({ error: '题目不存在' });
    }

    const updates = [];
    const params = [];

    if (type !== undefined) {
        if (!['single', 'multiple', 'essay'].includes(type)) {
            return res.status(400).json({ error: '题目类型无效' });
        }
        updates.push('type = ?');
        params.push(type);
    }
    if (content !== undefined) {
        updates.push('content = ?');
        params.push(content);
    }
    if (options !== undefined) {
        updates.push('options = ?');
        params.push(stringifyJSONField(options));
    }
    if (correct_answers !== undefined) {
        updates.push('correct_answers = ?');
        params.push(stringifyJSONField(correct_answers));
    }
    if (difficulty !== undefined) {
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            return res.status(400).json({ error: '难度级别无效' });
        }
        updates.push('difficulty = ?');
        params.push(difficulty);
    }
    if (knowledge_point !== undefined) {
        updates.push('knowledge_point = ?');
        params.push(knowledge_point);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: '没有要更新的字段' });
    }

    params.push(id);
    db.prepare(`UPDATE questions SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    res.json({
        ...question,
        options: parseJSONField(question.options, []),
        correct_answers: parseJSONField(question.correct_answers, [])
    });
});

router.delete('/questions/:id', (req, res) => {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    if (!existing) {
        return res.status(404).json({ error: '题目不存在' });
    }

    db.prepare('DELETE FROM questions WHERE id = ?').run(id);
    res.json({ message: '删除成功' });
});

router.get('/assignments', (req, res) => {
    const { userId, role } = req.query;

    let assignments;
    if (role === 'teacher' && userId) {
        assignments = db.prepare(`
            SELECT * FROM assignments WHERE teacher_id = ?
            ORDER BY created_at DESC
        `).all(userId);
    } else {
        assignments = db.prepare(`
            SELECT * FROM assignments WHERE published = 1
            ORDER BY created_at DESC
        `).all();
    }

    const formatted = assignments.map(a => ({
        ...a,
        question_ids: parseJSONField(a.question_ids, []),
        published: a.published === 1
    }));

    res.json({ data: formatted });
});

router.post('/assignments', (req, res) => {
    const { title, question_ids, total_score, deadline, review_start, review_deadline, teacher_id } = req.body;

    if (!title || !question_ids || !question_ids.length || !deadline || !review_start || !review_deadline || !teacher_id) {
        return res.status(400).json({ error: '缺少必填字段' });
    }

    if (question_ids.length < 10 || question_ids.length > 20) {
        return res.status(400).json({ error: '题目数量必须在10-20道之间' });
    }

    if (new Date(review_start) <= new Date(deadline)) {
        return res.status(400).json({ error: '互评开始时间必须晚于作业截止时间' });
    }

    if (new Date(review_deadline) <= new Date(review_start)) {
        return res.status(400).json({ error: '互评截止时间必须晚于互评开始时间' });
    }

    const id = uuidv4();
    db.prepare(`
        INSERT INTO assignments (id, title, question_ids, total_score, deadline, review_start, review_deadline, teacher_id, published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
        id,
        title,
        stringifyJSONField(question_ids),
        total_score || 100,
        deadline,
        review_start,
        review_deadline,
        teacher_id
    );

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
    const formattedAssignment = {
        ...assignment,
        question_ids: parseJSONField(assignment.question_ids, []),
        published: assignment.published === 1
    };

    notifyStudents(formattedAssignment);

    res.json(formattedAssignment);
});

router.get('/assignments/:id', (req, res) => {
    const { id } = req.params;

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
    if (!assignment) {
        return res.status(404).json({ error: '作业不存在' });
    }

    const questionIds = parseJSONField(assignment.question_ids, []);
    const questions = [];
    for (const qid of questionIds) {
        const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(qid);
        if (q) {
            questions.push({
                ...q,
                options: parseJSONField(q.options, []),
                correct_answers: parseJSONField(q.correct_answers, [])
            });
        }
    }

    res.json({
        ...assignment,
        question_ids: questionIds,
        questions,
        published: assignment.published === 1
    });
});

router.post('/assignments/:id/submit', (req, res) => {
    const { id: assignmentId } = req.params;
    const { student_id, answers } = req.body;

    if (!student_id) {
        return res.status(400).json({ error: '缺少学生ID' });
    }

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
    if (!assignment) {
        return res.status(404).json({ error: '作业不存在' });
    }

    const now = new Date();
    const deadline = new Date(assignment.deadline);
    if (now > deadline) {
        return res.status(400).json({ error: '作业已截止，无法提交' });
    }

    const existing = db.prepare(`
        SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?
    `).get(assignmentId, student_id);

    let submissionId;
    if (existing) {
        submissionId = existing.id;
        db.prepare(`
            UPDATE submissions SET answers = ?, submitted = 1, absent = 0, submitted_at = ?
            WHERE id = ?
        `).run(stringifyJSONField(answers), now.toISOString(), existing.id);
    } else {
        submissionId = uuidv4();
        db.prepare(`
            INSERT INTO submissions (id, assignment_id, student_id, answers, submitted, absent, submitted_at)
            VALUES (?, ?, ?, ?, 1, 0, ?)
        `).run(submissionId, assignmentId, student_id, stringifyJSONField(answers), now.toISOString());
    }

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
    const formattedSubmission = {
        ...submission,
        answers: parseJSONField(submission.answers, {}),
        submitted: submission.submitted === 1,
        absent: submission.absent === 1
    };

    notifySubmissionConfirmed(student_id, formattedSubmission);

    setTimeout(() => {
        try {
            const student = db.prepare('SELECT * FROM users WHERE id = ?').get(student_id);
            if (!student || !student.class_name) return;

            const submittedStudents = db.prepare(`
                SELECT s.student_id FROM submissions s
                JOIN users u ON s.student_id = u.id
                WHERE s.assignment_id = ? AND s.submitted = 1 AND u.class_name = ? AND s.student_id != ?
            `).all(assignmentId, student.class_name, student_id).map(s => s.student_id);

            const reviewers = submittedStudents
                .sort(() => Math.random() - 0.5)
                .slice(0, 3);

            for (const reviewerId of reviewers) {
                const existingReview = db.prepare(`
                    SELECT id FROM reviews WHERE submission_id = ? AND reviewer_id = ?
                `).get(submissionId, reviewerId);

                if (!existingReview) {
                    const reviewId = uuidv4();
                    db.prepare(`
                        INSERT INTO reviews (id, submission_id, reviewer_id, reviewee_id, completed)
                        VALUES (?, ?, ?, ?, 0)
                    `).run(reviewId, submissionId, reviewerId, student_id);

                    const review = db.prepare(`
                        SELECT r.*, a.title as assignment_title
                        FROM reviews r
                        JOIN submissions s ON r.submission_id = s.id
                        JOIN assignments a ON s.assignment_id = a.id
                        WHERE r.id = ?
                    `).get(reviewId);

                    notifyReviewAssigned(reviewerId, {
                        ...review,
                        completed: review.completed === 1
                    });
                }
            }

            const teacher = db.prepare(`
                SELECT teacher_id FROM assignments WHERE id = ?
            `).get(assignmentId);

            if (teacher) {
                const stats = db.prepare(`
                    SELECT
                        COUNT(DISTINCT s.id) as total_submissions,
                        COUNT(DISTINCT r.id) as total_reviews,
                        SUM(CASE WHEN r.completed = 1 THEN 1 ELSE 0 END) as completed_reviews
                    FROM submissions s
                    LEFT JOIN reviews r ON s.id = r.submission_id
                    WHERE s.assignment_id = ?
                `).get(assignmentId);

                notifyTeacherReviewProgress(teacher.teacher_id, {
                    assignment_id: assignmentId,
                    ...stats
                });
            }
        } catch (err) {
            console.error('Error assigning reviews:', err);
        }
    }, 100);

    res.json(formattedSubmission);
});

router.get('/assignments/:id/submissions', (req, res) => {
    const { id: assignmentId } = req.params;

    const submissions = db.prepare(`
        SELECT s.*, u.display_name as student_name, u.class_name
        FROM submissions s
        JOIN users u ON s.student_id = u.id
        WHERE s.assignment_id = ?
        ORDER BY s.submitted_at DESC
    `).all(assignmentId);

    const formatted = submissions.map(s => ({
        ...s,
        answers: parseJSONField(s.answers, {}),
        submitted: s.submitted === 1,
        absent: s.absent === 1,
        average_score: calculateSubmissionAverageScore(s.id)
    }));

    res.json({ data: formatted });
});

router.get('/assignments/:id/statistics', (req, res) => {
    const { id: assignmentId } = req.params;

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
    if (!assignment) {
        return res.status(404).json({ error: '作业不存在' });
    }

    const submissions = db.prepare(`
        SELECT s.id, s.answers, s.submitted, s.absent
        FROM submissions s
        WHERE s.assignment_id = ?
    `).all(assignmentId);

    const questionIds = parseJSONField(assignment.question_ids, []);
    const questions = questionIds.map(qid => {
        return db.prepare('SELECT * FROM questions WHERE id = ?').get(qid);
    }).filter(Boolean);

    const scores = [];
    const submissionStats = [];

    for (const s of submissions) {
        if (s.submitted === 1 && s.absent === 0) {
            const avg = calculateSubmissionAverageScore(s.id);
            if (avg !== null) {
                scores.push(avg);
            }
            submissionStats.push({
                id: s.id,
                answers: parseJSONField(s.answers, {}),
                submitted: true,
                absent: false
            });
        }
    }

    const averageScore = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : 0;

    const distribution = [0, 0, 0, 0, 0];
    for (const s of scores) {
        if (s < 60) distribution[0]++;
        else if (s < 70) distribution[1]++;
        else if (s < 80) distribution[2]++;
        else if (s < 90) distribution[3]++;
        else distribution[4]++;
    }

    const questionCorrectRates = [];
    for (const q of questions) {
        if (!q) continue;
        let correctCount = 0;
        let totalCount = 0;
        const correctAnswers = parseJSONField(q.correct_answers, []);

        for (const stat of submissionStats) {
            const answer = stat.answers[q.id];
            if (answer !== undefined && answer !== null) {
                totalCount++;
                if (q.type === 'essay') {
                    correctCount++;
                } else {
                    const isCorrect = Array.isArray(answer)
                        ? JSON.stringify(answer.sort()) === JSON.stringify(correctAnswers.sort())
                        : answer === correctAnswers[0];
                    if (isCorrect) correctCount++;
                }
            }
        }

        questionCorrectRates.push({
            question_id: q.id,
            question_type: q.type,
            content: q.content,
            correct_rate: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) / 100 : 0,
            correct_count: correctCount,
            total_count: totalCount
        });
    }

    res.json({
        average_score: averageScore,
        total_submissions: submissions.length,
        submitted_count: submissions.filter(s => s.submitted === 1).length,
        absent_count: submissions.filter(s => s.absent === 1).length,
        score_distribution: {
            '0-59': distribution[0],
            '60-69': distribution[1],
            '70-79': distribution[2],
            '80-89': distribution[3],
            '90-100': distribution[4]
        },
        question_correct_rates: questionCorrectRates
    });
});

router.get('/reviews/pending', (req, res) => {
    const { reviewerId } = req.query;

    if (!reviewerId) {
        return res.status(400).json({ error: '缺少reviewerId' });
    }

    const reviews = db.prepare(`
        SELECT r.*, a.id as assignment_id, a.title as assignment_title,
               a.review_deadline, u.display_name as reviewee_name
        FROM reviews r
        JOIN submissions s ON r.submission_id = s.id
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON r.reviewee_id = u.id
        WHERE r.reviewer_id = ? AND r.completed = 0
        ORDER BY a.review_deadline ASC
    `).all(reviewerId);

    const formatted = reviews.map(r => {
        const questions = parseJSONField(
            db.prepare('SELECT question_ids FROM assignments WHERE id = ?').get(r.assignment_id)?.question_ids,
            []
        );
        const submission = db.prepare('SELECT answers FROM submissions WHERE id = ?').get(r.submission_id);

        return {
            ...r,
            completed: r.completed === 1,
            scores: parseJSONField(r.scores, {}),
            feedback: parseJSONField(r.feedback, {}),
            question_count: questions.length,
            answers: parseJSONField(submission?.answers, {})
        };
    });

    res.json({ data: formatted });
});

router.post('/reviews/:id/submit', (req, res) => {
    const { id: reviewId } = req.params;
    const { scores, feedback } = req.body;

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
    if (!review) {
        return res.status(404).json({ error: '互评不存在' });
    }

    if (review.completed === 1) {
        return res.status(400).json({ error: '该互评已提交，无法再次提交' });
    }

    db.prepare(`
        UPDATE reviews SET scores = ?, feedback = ?, completed = 1, completed_at = ?
        WHERE id = ?
    `).run(
        stringifyJSONField(scores || {}),
        stringifyJSONField(feedback || {}),
        new Date().toISOString(),
        reviewId
    );

    const updated = db.prepare(`
        SELECT r.*, a.id as assignment_id, a.title as assignment_title,
               a.teacher_id
        FROM reviews r
        JOIN submissions s ON r.submission_id = s.id
        JOIN assignments a ON s.assignment_id = a.id
        WHERE r.id = ?
    `).get(reviewId);

    if (updated.teacher_id) {
        const stats = db.prepare(`
            SELECT
                COUNT(DISTINCT s.id) as total_submissions,
                COUNT(DISTINCT r.id) as total_reviews,
                SUM(CASE WHEN r.completed = 1 THEN 1 ELSE 0 END) as completed_reviews
            FROM submissions s
            LEFT JOIN reviews r ON s.id = r.submission_id
            WHERE s.assignment_id = ?
        `).get(updated.assignment_id);

        notifyTeacherReviewProgress(updated.teacher_id, {
            assignment_id: updated.assignment_id,
            ...stats
        });
    }

    res.json({
        ...updated,
        completed: updated.completed === 1,
        scores: parseJSONField(updated.scores, {}),
        feedback: parseJSONField(updated.feedback, {})
    });
});

router.put('/reviews/:id', (req, res) => {
    const { id: reviewId } = req.params;
    const { scores, feedback } = req.body;

    const review = db.prepare(`
        SELECT r.*, a.review_deadline
        FROM reviews r
        JOIN submissions s ON r.submission_id = s.id
        JOIN assignments a ON s.assignment_id = a.id
        WHERE r.id = ?
    `).get(reviewId);

    if (!review) {
        return res.status(404).json({ error: '互评不存在' });
    }

    const now = new Date();
    const deadline = new Date(review.review_deadline);
    if (now > deadline) {
        return res.status(400).json({ error: '互评已截止，无法修改' });
    }

    const updates = [];
    const params = [];

    if (scores !== undefined) {
        updates.push('scores = ?');
        params.push(stringifyJSONField(scores));
    }
    if (feedback !== undefined) {
        updates.push('feedback = ?');
        params.push(stringifyJSONField(feedback));
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: '没有要更新的字段' });
    }

    params.push(reviewId);
    db.prepare(`UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
    res.json({
        ...updated,
        completed: updated.completed === 1,
        scores: parseJSONField(updated.scores, {}),
        feedback: parseJSONField(updated.feedback, {})
    });
});

router.get('/results/:assignmentId', (req, res) => {
    const { assignmentId } = req.params;
    const { studentId } = req.query;

    if (!studentId) {
        return res.status(400).json({ error: '缺少studentId' });
    }

    const submission = db.prepare(`
        SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?
    `).get(assignmentId, studentId);

    if (!submission) {
        return res.status(404).json({ error: '未找到该作业提交记录' });
    }

    if (submission.submitted === 0 && submission.absent === 0) {
        return res.json({
            submission: {
                ...submission,
                answers: {},
                submitted: false,
                absent: false
            },
            average_score: null,
            reviews: []
        });
    }

    const reviews = db.prepare(`
        SELECT r.*, u.display_name as reviewer_name
        FROM reviews r
        JOIN users u ON r.reviewer_id = u.id
        WHERE r.submission_id = ?
        ORDER BY r.completed_at ASC
    `).all(submission.id);

    const formattedReviews = reviews.map(r => ({
        ...r,
        completed: r.completed === 1,
        scores: parseJSONField(r.scores, {}),
        feedback: parseJSONField(r.feedback, {})
    }));

    const averageScore = calculateSubmissionAverageScore(submission.id);

    res.json({
        submission: {
            ...submission,
            answers: parseJSONField(submission.answers, {}),
            submitted: submission.submitted === 1,
            absent: submission.absent === 1
        },
        average_score: averageScore,
        reviews: formattedReviews
    });
});

module.exports = router;
