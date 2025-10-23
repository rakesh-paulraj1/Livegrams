import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";

const JWT_SECRET =  "livesgram_password";
const wss = new WebSocketServer({ port: 8080 });

interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

function checkUserAuthentication(token: string | null): JWTPayload | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'livegrams-app',
      audience: 'livegrams-users'
    }) as JWTPayload;
    
    if (decoded && decoded.userId) {
      return decoded;
    }
    return null;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
}

wss.on("connection", function connection(ws, request) {
  const url = request.url;
  if (!url) {
    ws.close();
    return;
  }
  const params = new URLSearchParams(url.split("?")[1]);
  const token = params.get("token");
  const userInfo = checkUserAuthentication(token);
  if (!userInfo) {
    console.log('WebSocket connection rejected: Invalid token');
    ws.close();
    return;
  }

  console.log(`WebSocket connection established for user: ${userInfo.name} (${userInfo.email})`);
  
  (ws as any).userInfo = userInfo;
  
  ws.on("message", function message(data) {
    try {
      const messageData = JSON.parse(data.toString());
    
      if (messageData.roomId) {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === client.OPEN) {
            client.send(JSON.stringify({
              type: messageData.type || 'shape',
              shape: messageData.shape,
              roomId: messageData.roomId,
              user: {
                id: userInfo.userId,
                name: userInfo.name,
                email: userInfo.email
              }
            }));
          }
        });
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  ws.on("close", function close() {
    console.log(`WebSocket connection closed for user: ${userInfo.name}`);
  });
});