import { CanvasWithWebSocket } from "../../../components/CanvasWithWebSocket";

export default function CanvasPage({ params }: { params: { roomId: string } }) {
  const roomId = params.roomId; // ✅ no await needed
  return <CanvasWithWebSocket roomId={roomId} />;
}
