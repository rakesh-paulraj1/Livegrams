import { CanvasWithWebSocket } from "../../../components/CanvasWithWebSocket";

export default async  function CanvasPage({ params }: { params: { roomid: string } }) {
   const roomid = (await params).roomid;

  return <CanvasWithWebSocket roomId={roomid} />;
}
