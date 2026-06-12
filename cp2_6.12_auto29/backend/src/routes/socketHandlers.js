const userSockets = new Map();
let io = null;

function initSocketHandlers(ioInstance) {
    io = ioInstance;

    io.on('connection', (socket) => {
        const userId = socket.handshake.query.userId;

        if (userId) {
            userSockets.set(userId, socket.id);
            socket.userId = userId;
        }

        socket.on('disconnect', () => {
            if (socket.userId) {
                userSockets.delete(socket.userId);
            }
        });
    });
}

function notifyStudents(assignment) {
    if (!io) return;
    io.emit('assignment:published', assignment);
}

function notifySubmissionConfirmed(userId, submission) {
    if (!io) return;
    const socketId = userSockets.get(userId);
    if (socketId) {
        io.to(socketId).emit('submission:confirmed', submission);
    }
}

function notifyReviewAssigned(userId, review) {
    if (!io) return;
    const socketId = userSockets.get(userId);
    if (socketId) {
        io.to(socketId).emit('review:assigned', review);
    }
}

function notifyTeacherReviewProgress(teacherId, data) {
    if (!io) return;
    const socketId = userSockets.get(teacherId);
    if (socketId) {
        io.to(socketId).emit('review:progress', data);
    }
}

function getSocketIo() {
    return io;
}

module.exports = {
    initSocketHandlers,
    notifyStudents,
    notifySubmissionConfirmed,
    notifyReviewAssigned,
    notifyTeacherReviewProgress,
    getSocketIo
};
