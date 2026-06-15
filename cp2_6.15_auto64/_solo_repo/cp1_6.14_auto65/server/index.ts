import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  getPodcasts,
  getPodcastById,
  getTranscript,
  getComments,
  addComment,
  getHighlights,
  addHighlight,
  deleteHighlight,
} from "./database.js";
import {
  getTotalWavSize,
  parseRangeHeader,
  getSeedFromPodcastId,
  createWavReadableStream,
  createFullWavStream,
} from "./audio.js";

const PORT = 3001;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/podcasts", (_req, res) => {
  res.json(getPodcasts());
});

app.get("/api/podcasts/:id", (req, res) => {
  const podcast = getPodcastById(req.params.id);
  if (!podcast) {
    res.status(404).json({ message: "Podcast not found" });
    return;
  }
  res.json(podcast);
});

app.get("/api/podcasts/:id/audio", (req, res) => {
  const podcast = getPodcastById(req.params.id);
  if (!podcast) {
    res.status(404).json({ message: "Podcast not found" });
    return;
  }

  const totalSize = getTotalWavSize(podcast.duration);
  const range = parseRangeHeader(req.headers.range, totalSize);
  const seed = getSeedFromPodcastId(podcast.id);

  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=3600");

  if (!range) {
    res.status(200);
    res.setHeader("Content-Length", totalSize.toString());
    const stream = createFullWavStream(podcast.duration, seed);
    stream.on("error", (err) => {
      console.error("Stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Streaming error" });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
    return;
  }

  const { start, end } = range;
  const contentLength = end - start + 1;

  res.status(206);
  res.setHeader("Content-Length", contentLength.toString());
  res.setHeader("Content-Range", `bytes ${start}-${end}/${totalSize}`);

  const stream = createWavReadableStream(podcast.duration, start, end, seed);
  stream.on("error", (err) => {
    console.error("Stream error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Streaming error" });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
});

app.get("/api/podcasts/:id/transcript", (req, res) => {
  const podcast = getPodcastById(req.params.id);
  if (!podcast) {
    res.status(404).json({ message: "Podcast not found" });
    return;
  }
  res.json(getTranscript(req.params.id));
});

app.get("/api/podcasts/:id/comments", (req, res) => {
  const podcast = getPodcastById(req.params.id);
  if (!podcast) {
    res.status(404).json({ message: "Podcast not found" });
    return;
  }
  res.json(getComments(req.params.id));
});

app.post("/api/podcasts/:id/comments", (req, res) => {
  const { timestamp, text, author } = req.body;
  if (timestamp == null || !text || !author) {
    res.status(400).json({ message: "timestamp, text, and author are required" });
    return;
  }
  const podcast = getPodcastById(req.params.id);
  if (!podcast) {
    res.status(404).json({ message: "Podcast not found" });
    return;
  }
  const comment = addComment(req.params.id, { timestamp, text, author });
  res.status(201).json(comment);
});

app.get("/api/podcasts/:id/highlights", (req, res) => {
  const podcast = getPodcastById(req.params.id);
  if (!podcast) {
    res.status(404).json({ message: "Podcast not found" });
    return;
  }
  res.json(getHighlights(req.params.id));
});

app.post("/api/podcasts/:id/highlights", (req, res) => {
  const { text, timestamp } = req.body;
  if (!text || timestamp == null) {
    res.status(400).json({ message: "text and timestamp are required" });
    return;
  }
  const podcast = getPodcastById(req.params.id);
  if (!podcast) {
    res.status(404).json({ message: "Podcast not found" });
    return;
  }
  const highlight = addHighlight(req.params.id, { text, timestamp });
  res.status(201).json(highlight);
});

app.delete("/api/highlights/:id", (req, res) => {
  const deleted = deleteHighlight(req.params.id);
  if (!deleted) {
    res.status(404).json({ message: "Highlight not found" });
    return;
  }
  res.status(204).send();
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-podcast", (podcastId: string) => {
    socket.join(podcastId);
    console.log(`Socket ${socket.id} joined room: ${podcastId}`);
  });

  socket.on("leave-podcast", (podcastId: string) => {
    socket.leave(podcastId);
    console.log(`Socket ${socket.id} left room: ${podcastId}`);
  });

  socket.on("progress", (data: { podcastId: string; currentTime: number }) => {
    socket.to(data.podcastId).emit("progress", {
      socketId: socket.id,
      podcastId: data.podcastId,
      currentTime: data.currentTime,
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`AriaVault server running on http://localhost:${PORT}`);
});
