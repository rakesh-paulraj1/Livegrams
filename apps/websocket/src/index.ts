import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const wss = new WebSocketServer({ port: 8080 });

function checkUserAuthentication(token: string | null): string | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (decoded && typeof decoded === "object" && decoded.id) {
      return decoded.id;
    }
    return null;
  } catch (err) {
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
  const userId = checkUserAuthentication(token);
  if (!userId) {
    ws.close();
    return;
  }
  ws.on("message", function message(data) {
    ws.send("pong");
  });
});