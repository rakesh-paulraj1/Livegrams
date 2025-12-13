
export function getJWTTokenFromSession(session: any): string | null {
  if (!session || !session.accessToken) return null;
  return session.accessToken;
}

export function createAuthenticatedWebSocket(roomId: number, session: any): WebSocket | null {
  const token = getJWTTokenFromSession(session);
  
  if (!token) {
    console.error('No JWT token found in session. Please log in first.');
    return null;
  }
  const ws_url=process.env.WS_URL 
  
  const wsUrl = `${ws_url}?token=${encodeURIComponent(token)}&roomId=${roomId}`;
  
  try {
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected with authentication');
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket connection error:', error);
    };
    
    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
    };
    
    return socket;
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    return null;
  }
}



