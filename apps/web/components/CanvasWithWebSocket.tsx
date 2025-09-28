"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Canvas } from "./Canvas";
import { useSession } from "next-auth/react";

const WS_URL = "ws://localhost:8080";

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  error: string | null;
}

export function CanvasWithWebSocket({ roomId }: { roomId: string }) {
  const [wsState, setWsState] = useState<WebSocketState>({
    socket: null,
    isConnected: false,
    error: null,
  });
  console.log(roomId);
  const session = useSession();
  const socketRef = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (!session.data) {
      setWsState(prev => ({
        ...prev,
        error: "Session is missing."
      }));
      return;
    }

    const accessToken = (session.data as { accessToken?: string })?.accessToken;
    if (!accessToken) {
      setWsState(prev => ({
        ...prev,
        error: "Access token is missing."
      }));
      return;
    }

    try {
      const ws = new WebSocket(`${WS_URL}?token=${accessToken}`);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsState(prev => ({
          ...prev,
          socket: ws,
          isConnected: true,
          error: null
        }));

        const joinRoomData = JSON.stringify({
          type: "join_room",
          roomId
        });
        console.log('Joining room:', joinRoomData);
        ws.send(joinRoomData);
      };

    

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        socketRef.current = null;
        setWsState(prev => ({
          ...prev,
          socket: null,
          isConnected: false
        }));
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setWsState(prev => ({
        ...prev,
        error: 'Failed to create WebSocket connection'
      }));
    }
  }, [session, roomId]);

  useEffect(() => {
    if (session.status === 'loading') return;
    
    connectWebSocket();

  
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [session.status, connectWebSocket]);

  if (session.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading session...</div>
      </div>
    );
  }

  if (wsState.error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">
          Error: {wsState.error}
          <button 
            onClick={connectWebSocket}
            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (!wsState.isConnected || !wsState.socket) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Connecting to server...</div>
      </div>
    );
  }

  return (
    <div>
      <Canvas roomId={roomId} socket={wsState.socket} />
    </div>
  );
}