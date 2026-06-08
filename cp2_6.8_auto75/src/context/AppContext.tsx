import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { Role, RoomState, EditEvent, CodeCheckResult, BroadcastCode, CodeSnapshot, StudentDetailPayload } from '../types';
import { createWSClient } from '../services/wsClient';

interface AppContextValue {
  role: Role | null;
  nickname: string;
  roomCode: string;
  roomName: string;
  studentId: string;
  roomState: RoomState | null;
  editEvents: EditEvent[];
  codeCheckResults: CodeCheckResult[];
  broadcastCode: BroadcastCode | null;
  selectedStudentId: string | null;
  studentDetail: StudentDetailPayload | null;
  error: string | null;
  createRoom: (roomName: string, teacherName: string) => void;
  joinRoom: (roomCode: string, nickname: string, role: Role) => void;
  sendEditEvent: (event: Omit<EditEvent, 'studentId' | 'nickname' | 'timestamp'>) => void;
  sendCodeSnapshot: (code: string) => void;
  requestStudentDetail: (studentId: string) => void;
  broadcastStudentCode: (studentId: string) => void;
  setSelectedStudentId: (id: string | null) => void;
  dismissBroadcastCode: () => void;
  clearError: () => void;
  disconnect: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role | null>(null);
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [editEvents, setEditEvents] = useState<EditEvent[]>([]);
  const [codeCheckResults, setCodeCheckResults] = useState<CodeCheckResult[]>([]);
  const [broadcastCode, setBroadcastCode] = useState<BroadcastCode | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<ReturnType<typeof createWSClient> | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const dismissBroadcastCode = useCallback(() => setBroadcastCode(null), []);

  const createRoom = useCallback((rName: string, tName: string) => {
    const ws = createWSClient();
    wsRef.current = ws;
    setRole('teacher');
    setNickname(tName);
    setRoomName(rName);

    ws.on('ROOM_STATE', (payload: RoomState) => {
      setRoomCode(payload.roomCode);
      setRoomState(payload);
    });

    ws.on('EDIT_EVENT', (payload: EditEvent) => {
      setEditEvents(prev => [...prev, payload]);
    });

    ws.on('CODE_CHECK_RESULT', (payload: CodeCheckResult) => {
      setCodeCheckResults(prev => [...prev, payload]);
    });

    ws.on('STUDENT_DETAIL', (payload: StudentDetailPayload) => {
      setStudentDetail(payload);
    });

    ws.on('STUDENT_LEFT', () => {});

    ws.on('ERROR', (msg: string) => {
      setError(msg);
    });

    ws.send('CREATE_ROOM', { roomName: rName, teacherName: tName });
  }, []);

  const joinRoom = useCallback((rCode: string, nName: string, r: Role) => {
    const ws = createWSClient();
    wsRef.current = ws;
    setRole(r);
    setNickname(nName);
    setRoomCode(rCode.toUpperCase());

    ws.on('ROOM_STATE', (payload: RoomState) => {
      setRoomState(payload);
      setRoomName(payload.roomName);
    });

    ws.on('EDIT_EVENT', (payload: EditEvent) => {
      if (r === 'teacher') {
        setEditEvents(prev => [...prev, payload]);
      }
    });

    ws.on('CODE_CHECK_RESULT', (payload: CodeCheckResult) => {
      if (r === 'teacher') {
        setCodeCheckResults(prev => [...prev, payload]);
      }
    });

    ws.on('BROADCAST_CODE', (payload: BroadcastCode) => {
      setBroadcastCode(payload);
    });

    ws.on('ERROR', (msg: string) => {
      setError(msg);
    });

    ws.send('JOIN_ROOM', { roomCode: rCode.toUpperCase(), nickname: nName, role: r });
  }, []);

  const sendEditEvent = useCallback((event: Omit<EditEvent, 'studentId' | 'nickname' | 'timestamp'>) => {
    wsRef.current?.send('EDIT_EVENT', event);
  }, []);

  const sendCodeSnapshot = useCallback((code: string) => {
    wsRef.current?.send('CODE_SNAPSHOT', { code });
  }, []);

  const requestStudentDetail = useCallback((sid: string) => {
    wsRef.current?.send('REQUEST_STUDENT_DETAIL', { studentId: sid });
  }, []);

  const broadcastStudentCode = useCallback((sid: string) => {
    wsRef.current?.send('BROADCAST_CODE', { studentId: sid });
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setRole(null);
    setNickname('');
    setRoomCode('');
    setRoomName('');
    setStudentId('');
    setRoomState(null);
    setEditEvents([]);
    setCodeCheckResults([]);
    setBroadcastCode(null);
    setSelectedStudentId(null);
    setStudentDetail(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (roomState && role === 'student') {
      const me = roomState.students.find(s => s.nickname === nickname);
      if (me) setStudentId(me.id);
    }
  }, [roomState, nickname, role]);

  const value: AppContextValue = {
    role,
    nickname,
    roomCode,
    roomName,
    studentId,
    roomState,
    editEvents,
    codeCheckResults,
    broadcastCode,
    selectedStudentId,
    studentDetail,
    error,
    createRoom,
    joinRoom,
    sendEditEvent,
    sendCodeSnapshot,
    requestStudentDetail,
    broadcastStudentCode,
    setSelectedStudentId,
    dismissBroadcastCode,
    clearError,
    disconnect,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
