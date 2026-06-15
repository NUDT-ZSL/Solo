import { Server, Socket } from "socket.io";

export function setupSocketHandler(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("node:lock", ({ storyId, nodeId, userId, nickname, color }) => {
      socket.join(storyId);
      socket.to(storyId).emit("node:locked", { storyId, nodeId, userId, nickname, color });
    });

    socket.on("node:unlock", ({ storyId, nodeId, userId }) => {
      socket.to(storyId).emit("node:unlocked", { storyId, nodeId, userId });
    });

    socket.on("node:create", ({ storyId, node }) => {
      socket.to(storyId).emit("node:created", { storyId, node });
    });

    socket.on("join:story", ({ storyId }) => {
      socket.join(storyId);
    });

    socket.on("leave:story", ({ storyId }) => {
      socket.leave(storyId);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
