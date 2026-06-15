import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';

interface PollData {
  code: string;
  title: string;
  description: string;
  options: { text: string; votes: number }[];
  totalVotes: number;
  isEnded: boolean;
  createdAt: number;
  creatorId: string;
}

interface ClientMessage {
  type: 'CREATE_POLL' | 'JOIN_POLL' | 'VOTE' | 'END_POLL';
  title?: string;
  description?: string;
  options?: string[];
  pollCode?: string;
  optionIndex?: number;
}

interface ServerMessageBase {
  type: string;
}

interface PollCreatedMessage extends ServerMessageBase {
  type: 'POLL_CREATED';
  pollCode: string;
  poll: PollData;
}

interface PollJoinedMessage extends ServerMessageBase {
  type: 'POLL_JOINED';
  poll: PollData;
}

interface PollNotFoundMessage extends ServerMessageBase {
  type: 'POLL_NOT_FOUND';
}

interface VoteUpdateMessage extends ServerMessageBase {
  type: 'VOTE_UPDATE';
  poll: PollData;
}

interface PollEndedMessage extends ServerMessageBase {
  type: 'POLL_ENDED';
  poll: PollData;
}

interface OnlineCountMessage extends ServerMessageBase {
  type: 'ONLINE_COUNT';
  count: number;
}

interface NotificationMessage extends ServerMessageBase {
  type: 'NOTIFICATION';
  message: string;
}

interface AllPollsMessage extends ServerMessageBase {
  type: 'ALL_POLLS';
  polls: PollData[];
}

type ServerMessage =
  | PollCreatedMessage
  | PollJoinedMessage
  | PollNotFoundMessage
  | VoteUpdateMessage
  | PollEndedMessage
  | OnlineCountMessage
  | NotificationMessage
  | AllPollsMessage;

interface ExtendedWebSocket extends WebSocket {
  id: string;
  votedPolls: Set<string>;
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const polls: Map<string, PollData> = new Map();
const pollSubscribers: Map<string, Set<string>> = new Map();
const clients: Map<string, ExtendedWebSocket> = new Map();

const generatePollCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (polls.has(code));
  return code;
};

const generateClientId = (): string => {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const sendMessage = (ws: WebSocket, message: ServerMessage): void => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};

const broadcastToPoll = (pollCode: string, message: ServerMessage): void => {
  const subscribers = pollSubscribers.get(pollCode);
  if (!subscribers) return;

  subscribers.forEach((clientId) => {
    const client = clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      sendMessage(client, message);
    }
  });
};

const broadcastOnlineCount = (): void => {
  const count = clients.size;
  const message: OnlineCountMessage = { type: 'ONLINE_COUNT', count };
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      sendMessage(client, message);
    }
  });
};

const subscribeClientToPoll = (clientId: string, pollCode: string): void => {
  if (!pollSubscribers.has(pollCode)) {
    pollSubscribers.set(pollCode, new Set());
  }
  pollSubscribers.get(pollCode)!.add(clientId);
};

const handleCreatePoll = (ws: ExtendedWebSocket, data: ClientMessage): void => {
  if (!data.title || !data.options || data.options.length < 2) {
    sendMessage(ws, {
      type: 'NOTIFICATION',
      message: '创建投票失败：需要标题和至少2个选项',
    });
    return;
  }

  const code = generatePollCode();
  const poll: PollData = {
    code,
    title: data.title,
    description: data.description || '',
    options: data.options.map((text) => ({ text, votes: 0 })),
    totalVotes: 0,
    isEnded: false,
    createdAt: Date.now(),
    creatorId: ws.id,
  };

  polls.set(code, poll);
  subscribeClientToPoll(ws.id, code);

  sendMessage(ws, { type: 'POLL_CREATED', pollCode: code, poll });

  broadcastToPoll(code, {
    type: 'NOTIFICATION',
    message: `投票「${poll.title}」已创建`,
  });
};

const handleJoinPoll = (ws: ExtendedWebSocket, data: ClientMessage): void => {
  const pollCode = data.pollCode?.toUpperCase();
  if (!pollCode) {
    sendMessage(ws, { type: 'POLL_NOT_FOUND' });
    return;
  }

  const poll = polls.get(pollCode);
  if (!poll) {
    sendMessage(ws, { type: 'POLL_NOT_FOUND' });
    return;
  }

  subscribeClientToPoll(ws.id, pollCode);
  sendMessage(ws, { type: 'POLL_JOINED', poll });

  broadcastToPoll(pollCode, {
    type: 'NOTIFICATION',
    message: '新用户加入了投票',
  });
};

const handleVote = (ws: ExtendedWebSocket, data: ClientMessage): void => {
  const pollCode = data.pollCode?.toUpperCase();
  const optionIndex = data.optionIndex;

  if (!pollCode || optionIndex === undefined) {
    sendMessage(ws, {
      type: 'NOTIFICATION',
      message: '投票失败：参数不完整',
    });
    return;
  }

  const poll = polls.get(pollCode);
  if (!poll) {
    sendMessage(ws, { type: 'POLL_NOT_FOUND' });
    return;
  }

  if (poll.isEnded) {
    sendMessage(ws, {
      type: 'NOTIFICATION',
      message: '该投票已结束',
    });
    return;
  }

  if (ws.votedPolls.has(pollCode)) {
    sendMessage(ws, {
      type: 'NOTIFICATION',
      message: '您已经投过票了',
    });
    return;
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    sendMessage(ws, {
      type: 'NOTIFICATION',
      message: '无效的选项',
    });
    return;
  }

  poll.options[optionIndex].votes += 1;
  poll.totalVotes += 1;
  ws.votedPolls.add(pollCode);

  broadcastToPoll(pollCode, { type: 'VOTE_UPDATE', poll });
};

const handleEndPoll = (ws: ExtendedWebSocket, data: ClientMessage): void => {
  const pollCode = data.pollCode?.toUpperCase();
  if (!pollCode) {
    sendMessage(ws, { type: 'POLL_NOT_FOUND' });
    return;
  }

  const poll = polls.get(pollCode);
  if (!poll) {
    sendMessage(ws, { type: 'POLL_NOT_FOUND' });
    return;
  }

  if (poll.creatorId !== ws.id) {
    sendMessage(ws, {
      type: 'NOTIFICATION',
      message: '只有创建者可以结束投票',
    });
    return;
  }

  poll.isEnded = true;
  broadcastToPoll(pollCode, { type: 'POLL_ENDED', poll });
};

const handleMessage = (ws: ExtendedWebSocket, rawMessage: string): void => {
  try {
    const data: ClientMessage = JSON.parse(rawMessage);

    switch (data.type) {
      case 'CREATE_POLL':
        handleCreatePoll(ws, data);
        break;
      case 'JOIN_POLL':
        handleJoinPoll(ws, data);
        break;
      case 'VOTE':
        handleVote(ws, data);
        break;
      case 'END_POLL':
        handleEndPoll(ws, data);
        break;
      default:
        sendMessage(ws, {
          type: 'NOTIFICATION',
          message: '未知的消息类型',
        });
    }
  } catch {
    sendMessage(ws, {
      type: 'NOTIFICATION',
      message: '消息格式错误',
    });
  }
};

const cleanupClient = (clientId: string): void => {
  pollSubscribers.forEach((subscribers) => {
    subscribers.delete(clientId);
  });
  clients.delete(clientId);
  broadcastOnlineCount();
};

wss.on('connection', (ws: WebSocket) => {
  const extWs = ws as ExtendedWebSocket;
  extWs.id = generateClientId();
  extWs.votedPolls = new Set();
  clients.set(extWs.id, extWs);

  const allPolls = Array.from(polls.values()).filter((p) => !p.isEnded);
  sendMessage(extWs, { type: 'ALL_POLLS', polls: allPolls });

  broadcastOnlineCount();

  ws.on('message', (message: Buffer) => {
    handleMessage(extWs, message.toString());
  });

  ws.on('close', () => {
    cleanupClient(extWs.id);
  });

  ws.on('error', () => {
    cleanupClient(extWs.id);
  });
});

app.get('/api/polls', (_req, res) => {
  const allPolls = Array.from(polls.values());
  res.json(allPolls);
});

app.get('/api/polls/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const poll = polls.get(code);
  if (!poll) {
    res.status(404).json({ error: '投票不存在' });
  } else {
    res.json(poll);
  }
});

app.get('/api/online', (_req, res) => {
  res.json({ count: clients.size });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

export { server, app, wss };
