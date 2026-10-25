import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoomState } from '../types';

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export function useGameRoom(roomIdFromUrl?: string) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let sessionToken = localStorage.getItem('ph_token');
    if (!sessionToken) {
      sessionToken = 'usr_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('ph_token', sessionToken);
    }

    const defaultNames = ['SwiftFalcon', 'CozyOtter', 'NeonTiger', 'BoldEagle', 'BriskFox'];
    const emojis = ['🦊', '🐯', '🚀', '⚡', '🦉', '🐙', '👾', '🔥'];
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

    const storedProfile = localStorage.getItem('ph_profile');
    const profile = storedProfile
      ? JSON.parse(storedProfile)
      : {
          name: defaultNames[Math.floor(Math.random() * defaultNames.length)],
          avatar: emojis[Math.floor(Math.random() * emojis.length)],
          color: colors[Math.floor(Math.random() * colors.length)],
        };

    localStorage.setItem('ph_profile', JSON.stringify(profile));

    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room', { roomId: roomIdFromUrl, playerProfile: profile, sessionToken });
    });

    socket.on('sync_state', (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomIdFromUrl]);

  const sendAction = (actionType: string, payload?: any) => {
    if (payload !== undefined) {
      socketRef.current?.emit(actionType, payload);
    } else {
      socketRef.current?.emit(actionType);
    }
  };

  return { socket: socketRef.current, room, sendAction };
}
