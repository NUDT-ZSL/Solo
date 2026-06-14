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
  getTotalAudioSize,
  generateWavChunk,
  getAudioDurationSamples,
  parseRangeHeader,
  getSeedFromPodcastId,
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

  const totalSize = getTotalAudioSize(podcast.duration);
  const range = parseRangeHeader(req.headers.range, totalSize);
  const seed = getSeedFromPodcastId(podcast.id);

  if (!range) {
    res.status(200);
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", totalSize.toString());
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600");

    const headerSize = 44;
    const totalSamples = getAudioDurationSamples(podcast.duration);
    const headerChunk = Buffer.alloc(headerSize);
    headerChunk.write("RIFF", 0);
    headerChunk.writeUInt32LE(36 + totalSamples * 2, 4);
    headerChunk.write("WAVE", 8);
    headerChunk.write("fmt ", 12);
    headerChunk.writeUInt32LE(16, 16);
    headerChunk.writeUInt16LE(1, 20);
    headerChunk.writeUInt16LE(1, 22);
    headerChunk.writeUInt32LE(22050, 24);
    headerChunk.writeUInt32LE(44100, 28);
    headerChunk.writeUInt16LE(2, 32);
    headerChunk.writeUInt16LE(16, 34);
    headerChunk.write("data", 36);
    headerChunk.writeUInt32LE(totalSamples * 2, 40);

    res.write(headerChunk);

    const chunkSize = 22050 * 2;
    for (let offset = 0; offset < totalSamples; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, totalSamples);
      const chunk = generateWavChunk(podcast.duration, offset, end, seed);
      if (!res.write(chunk)) {
        // Backpressure handling would need async iteration;
        // for demo purposes we flush synchronously
      }
    }
    res.end();
    return;
  }

  const { start, end } = range;
  const contentLength = end - start + 1;

  res.status(206);
  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Content-Length", contentLength.toString());
  res.setHeader("Content-Range", `bytes ${start}-${end}/${totalSize}`);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=3600");

  const headerSize = 44;
  const totalSamples = getAudioDurationSamples(podcast.duration);

  if (start < headerSize) {
    const headerChunk = Buffer.alloc(headerSize);
    headerChunk.write("RIFF", 0);
    headerChunk.writeUInt32LE(36 + totalSamples * 2, 4);
    headerChunk.write("WAVE", 8);
    headerChunk.write("fmt ", 12);
    headerChunk.writeUInt32LE(16, 16);
    headerChunk.writeUInt16LE(1, 20);
    headerChunk.writeUInt16LE(1, 22);
    headerChunk.writeUInt32LE(22050, 24);
    headerChunk.writeUInt32LE(44100, 28);
    headerChunk.writeUInt16LE(2, 32);
    headerChunk.writeUInt16LE(16, 34);
    headerChunk.write("data", 36);
    headerChunk.writeUInt32LE(totalSamples * 2, 40);

    const startInHeader = start;
    const endInHeader = Math.min(end, headerSize - 1);
    const slice = headerChunk.slice(startInHeader, endInHeader + 1);
    res.write(slice);

    if (end < headerSize) {
      res.end();
      return;
    }

    const dataStartSample = 0;
    const dataEndByte = end;
    const dataEndSample = Math.floor((dataEndByte - headerSize) / 2);
    const chunk = generateWavChunk(podcast.duration, dataStartSample, dataEndSample + 1, seed);
    res.write(chunk);
    res.end();
    return;
  }

  const dataStartByte = start - headerSize;
  const dataEndByte = end - headerSize;
  const dataStartSample = Math.floor(dataStartByte / 2);
  const dataEndSample = Math.floor(dataEndByte / 2);

  const chunk = generateWavChunk(podcast.duration, dataStartSample, dataEndSample + 1, seed);
  const byteOffset = dataStartByte % 2;
  const responseChunk = chunk.slice(byteOffset, byteOffset + contentLength);
  res.end(responseChunk);
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
