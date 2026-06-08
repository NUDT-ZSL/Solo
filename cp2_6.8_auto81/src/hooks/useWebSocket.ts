import { useEffect, useRef, useCallback } from 'react';
import type { Annotation, ClientMessage, ServerMessage, Snapshot } from '@/types';
import { useAppStore } from '@/store';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(`client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const reconnectTimerRef = useRef<number | null>(null);
  const simulatedAnnTimerRef = useRef<number | null>(null);

  const addAnnotation = useAppStore((s) => s.addAnnotation);
  const moveAnnotation = useAppStore((s) => s.moveAnnotation);
  const deleteAnnotation = useAppStore((s) => s.deleteAnnotation);
  const setAnnotations = useAppStore((s) => s.setAnnotations);
  const setOnlineCount = useAppStore((s) => s.setOnlineCount);
  const addSnapshot = useAppStore((s) => s.addSnapshot);
  const setSnapshots = useAppStore((s) => s.setSnapshots);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        ws.send(JSON.stringify({ type: 'sync', payload: { clientId: clientIdRef.current } }));
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          switch (msg.type) {
            case 'annotation_add':
              if (msg.payload.clientId !== clientIdRef.current) {
                addAnnotation(msg.payload.annotation as Annotation);
              }
              break;
            case 'annotation_move':
              if (msg.payload.clientId !== clientIdRef.current) {
                moveAnnotation(msg.payload.id, msg.payload.x, msg.payload.y);
              }
              break;
            case 'annotation_delete':
              if (msg.payload.clientId !== clientIdRef.current) {
                deleteAnnotation(msg.payload.id);
              }
              break;
            case 'user_count':
              setOnlineCount(msg.payload.count as number);
              break;
            case 'sync_all':
              setAnnotations(msg.payload.annotations as Annotation[]);
              setSnapshots(msg.payload.snapshots as Snapshot[]);
              setOnlineCount(msg.payload.userCount as number);
              break;
            case 'snapshot_created':
              if (msg.payload.clientId !== clientIdRef.current) {
                addSnapshot(msg.payload.snapshot as Snapshot);
              }
              break;
            case 'snapshot_list':
              setSnapshots(msg.payload.snapshots as Snapshot[]);
              break;
          }
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected, retrying in 3s...');
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = window.setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };
    } catch (e) {
      console.error('[WS] Connection failed:', e);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = window.setTimeout(connect, 3000);
    }
  }, [addAnnotation, moveAnnotation, deleteAnnotation, setAnnotations, setOnlineCount, addSnapshot, setSnapshots]);

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        payload: { ...message.payload, clientId: clientIdRef.current },
      }));
    }
  }, []);

  useEffect(() => {
    connect();

    if (simulatedAnnTimerRef.current) clearInterval(simulatedAnnTimerRef.current);
    simulatedAnnTimerRef.current = window.setInterval(() => {
      const simulatedCount = Math.floor(Math.random() * 2);
      setOnlineCount(1 + simulatedCount);
    }, 10000);

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (simulatedAnnTimerRef.current) clearInterval(simulatedAnnTimerRef.current);
    };
  }, [connect, setOnlineCount]);

  return { send, clientId: clientIdRef.current };
}
