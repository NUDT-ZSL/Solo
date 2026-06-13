import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import type { WsMessage } from "../types/models";

const connectedClients = new Map<string, Set<WebSocket>>();

export function initWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const memberId = url.searchParams.get("memberId") ?? "guest";

    if (!connectedClients.has(memberId)) {
      connectedClients.set(memberId, new Set());
    }
    connectedClients.get(memberId)!.add(ws);

    ws.on("close", () => {
      const clients = connectedClients.get(memberId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          connectedClients.delete(memberId);
        }
      }
    });

    ws.on("error", () => {
      const clients = connectedClients.get(memberId);
      if (clients) {
        clients.delete(ws);
      }
    });
  });

  console.log("WebSocket server initialized on /ws");
  return wss;
}

export function broadcastToMembers(message: WsMessage): void {
  const payload = JSON.stringify(message);
  for (const memberId of message.affectedMembers) {
    const clients = connectedClients.get(memberId);
    if (clients) {
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    }
  }
  const guestClients = connectedClients.get("guest");
  if (guestClients) {
    for (const ws of guestClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}

export function broadcastAll(message: WsMessage): void {
  const payload = JSON.stringify(message);
  for (const clients of connectedClients.values()) {
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}
