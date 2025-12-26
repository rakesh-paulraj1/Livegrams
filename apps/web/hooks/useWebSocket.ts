import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { createAuthenticatedWebSocket } from '../utils/websocket';


export function useWebSocket(roomId: number) {
  const { data: session, status } = useSession();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session && roomId) {
      const socket = createAuthenticatedWebSocket(roomId, session);
      
      if (socket) {
        socketRef.current = socket;
        socket.onopen = () => {
          console.log('WebSocket connected with session authentication');
        };
        
        socket.onerror = (error) => {
          console.error('WebSocket connection error:', error);
        };
        
        socket.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
        };
      }
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [session, status, roomId]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.readyState === WebSocket.OPEN,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading'
  };
}




