const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const db = require('./src/database/db');
const authRoutes = require('./src/routes/authRoutes');
const examRoutes = require('./src/routes/examRoutes');
const { initSocketHandlers } = require('./src/routes/socketHandlers');
const { v4: uuidv4 } = require('uuid');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.set('io', io);

app.use('/api/auth', authRoutes);
app.use('/api', examRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

initSocketHandlers(io);

function markAbsentStudents() {
    const now = new Date();

    const expiredAssignments = db.prepare(`
        SELECT id FROM assignments
        WHERE deadline < ? AND published = 1
    `).all(now.toISOString());

    for (const assignment of expiredAssignments) {
        const students = db.prepare(`
            SELECT id FROM users WHERE role = 'student'
        `).all();

        for (const student of students) {
            const existing = db.prepare(`
                SELECT id, submitted, absent FROM submissions
                WHERE assignment_id = ? AND student_id = ?
            `).get(assignment.id, student.id);

            if (!existing) {
                db.prepare(`
                    INSERT INTO submissions (id, assignment_id, student_id, answers, submitted, absent, submitted_at)
                    VALUES (?, ?, ?, NULL, 0, 1, NULL)
                `).run(uuidv4(), assignment.id, student.id);
            } else if (existing.submitted === 0 && existing.absent === 0) {
                db.prepare(`
                    UPDATE submissions SET absent = 1 WHERE id = ?
                `).run(existing.id);
            }
        }
    }
}

markAbsentStudents();

setInterval(markAbsentStudents, 60 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = { app, server, io };
