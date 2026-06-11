import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import { ProposalsStore } from "./models/proposal";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(bodyParser.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173" },
});

const store = new ProposalsStore();
const socketProposalMap = new Map<string, string>();
const socketUserMap = new Map<string, { proposalId: string; userId: string; username: string; color: string }>();

app.get("/api/proposals", (_req, res) => {
  const proposals = store.getAll().map((p) => ({
    ...p,
    versions: p.versions.slice(-5),
  }));
  res.json(proposals);
});

app.post("/api/proposals", (req, res) => {
  const { title, content, creatorName } = req.body;
  const creatorId = `user-${Date.now()}`;
  const proposal = store.create(title, creatorId, creatorName);
  if (content) {
    store.update(proposal.id, { content });
  }
  const updated = store.getById(proposal.id)!;
  updated.shareLink = `/proposal/${updated.id}`;
  res.json(updated);
});

app.get("/api/proposals/:id", (req, res) => {
  const proposal = store.getById(req.params.id);
  if (!proposal) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  res.json(proposal);
});

app.put("/api/proposals/:id", (req, res) => {
  const { content, contentBlocks, editorId, editorName } = req.body;
  const proposal = store.addVersion(
    req.params.id,
    editorId,
    editorName,
    content,
    contentBlocks || []
  );
  if (!proposal) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  io.to(req.params.id).emit("proposal-updated", proposal);
  res.json(proposal);
});

app.post("/api/proposals/:id/restore", (req, res) => {
  const { versionNumber, editorId, editorName } = req.body;
  const version = store.getVersion(req.params.id, versionNumber);
  if (!version) {
    res.status(404).json({ error: "Version not found" });
    return;
  }
  const proposal = store.addVersion(
    req.params.id,
    editorId,
    editorName,
    version.content,
    version.contentBlocks
  );
  if (!proposal) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  io.to(req.params.id).emit("proposal-updated", proposal);
  res.json(proposal);
});

app.get("/api/proposals/share/:shareLink", (req, res) => {
  const proposals = store.getAll();
  const proposal = proposals.find(
    (p) => p.shareLink === `/proposal/${req.params.shareLink}`
  );
  if (!proposal) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  res.json(proposal);
});

io.on("connection", (socket) => {
  socket.on("join-proposal", (data: { proposalId: string; userId: string; username: string; color: string }) => {
    socket.join(data.proposalId);
    socketProposalMap.set(socket.id, data.proposalId);
    socketUserMap.set(socket.id, { proposalId: data.proposalId, userId: data.userId, username: data.username, color: data.color });
    const proposal = store.addCollaborator(data.proposalId, data.userId, data.username);
    if (proposal) {
      socket.to(data.proposalId).emit("collaborator-joined", {
        userId: data.userId,
        username: data.username,
        color: data.color,
      });
    }
  });

  socket.on("leave-proposal", (data: { proposalId: string; userId: string }) => {
    socket.leave(data.proposalId);
    socketProposalMap.delete(socket.id);
    socketUserMap.delete(socket.id);
    const proposal = store.removeCollaborator(data.proposalId, data.userId);
    if (proposal) {
      socket.to(data.proposalId).emit("collaborator-left", {
        userId: data.userId,
      });
    }
  });

  let contentChangeTimer: NodeJS.Timeout | null = null;
  let pendingContentChange: { proposalId: string; content: string; userId: string } | null = null;

  socket.on("content-change", (data: { proposalId: string; content: string; userId: string }) => {
    pendingContentChange = data;
    if (contentChangeTimer) {
      clearTimeout(contentChangeTimer);
    }
    contentChangeTimer = setTimeout(() => {
      if (pendingContentChange) {
        socket.to(pendingContentChange.proposalId).emit("remote-content-change", {
          content: pendingContentChange.content,
          userId: pendingContentChange.userId,
        });
        pendingContentChange = null;
        contentChangeTimer = null;
      }
    }, 50);
  });

  socket.on("cursor-move", (data: { proposalId: string; userId: string; position: number; cursorPosition: { line: number; column: number } }) => {
    const userInfo = socketUserMap.get(socket.id);
    socket.to(data.proposalId).emit("remote-cursor-move", {
      userId: data.userId,
      username: userInfo?.username || "",
      position: data.position,
      cursorPosition: data.cursorPosition,
      color: userInfo?.color || "#95A5A6",
    });
  });

  socket.on("disconnect", () => {
    const userInfo = socketUserMap.get(socket.id);
    if (userInfo) {
      const { proposalId, userId } = userInfo;
      socketProposalMap.delete(socket.id);
      socketUserMap.delete(socket.id);
      const proposal = store.removeCollaborator(proposalId, userId);
      if (proposal) {
        io.to(proposalId).emit("collaborator-left", {
          userId,
        });
      }
    }
    if (contentChangeTimer) {
      clearTimeout(contentChangeTimer);
    }
  });
});

httpServer.listen(3001, () => {
  console.log("Server running on port 3001");
});
