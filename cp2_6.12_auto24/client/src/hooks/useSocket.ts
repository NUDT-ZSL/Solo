import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { PetState, PetType } from '../types';

interface UseSocketReturn {
  socket: Socket | null;
  joinRoom: (roomId: string) => void;
  selectPet: (type: PetType, name: string, roomId: string) => void;
  performAction: (type: 'feed' | 'play' | 'train', roomId: string) => void;
}

interface UseSocketProps {
  ownerId: string;
  onRoomState: (pets: Record<string, PetState>) => void;
  onPetUpdated: (pet: PetState) => void;
  onPetJoined: (ownerId: string) => void;
  onPetLeft: (ownerId: string) => void;
  onActionResult: (data: { pet: PetState; event: any }) => void;
}

export function useSocket(props: UseSocketProps): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const socket = io('http://localhost:3001', {
      query: { ownerId: props.ownerId },
      transports: ['websocket', 'polling'],
    });

    socket.on('room-state', (data) => {
      propsRef.current.onRoomState(data.pets);
    });

    socket.on('pet-updated', (data) => {
      propsRef.current.onPetUpdated(data.pet);
    });

    socket.on('pet-joined', (data) => {
      propsRef.current.onPetJoined(data.ownerId);
    });

    socket.on('pet-left', (data) => {
      propsRef.current.onPetLeft(data.ownerId);
    });

    socket.on('action-result', (data) => {
      propsRef.current.onActionResult(data);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [props.ownerId]);

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('join-room', { roomId });
  }, []);

  const selectPet = useCallback((type: PetType, name: string, roomId: string) => {
    socketRef.current?.emit('select-pet', { type, name, roomId });
  }, []);

  const performAction = useCallback((type: 'feed' | 'play' | 'train', roomId: string) => {
    socketRef.current?.emit('action', { type, roomId });
  }, []);

  return {
    socket: socketRef.current,
    joinRoom,
    selectPet,
    performAction,
  };
}
