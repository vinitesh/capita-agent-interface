import { useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef(null);

  const connect = useCallback((contextId, onProgressUpdate) => {
    const socket = io(BASE_URL);
    socket.emit('join_room', contextId);
    socket.on('progress_update', (status) => {
      onProgressUpdate(status);
    });
    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  return { connect, disconnect };
}
