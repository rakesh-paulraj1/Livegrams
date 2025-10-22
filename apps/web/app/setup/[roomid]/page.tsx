
import { TldrawMultiplayer } from "../../../components/TldrawMultiplayer";

export default async function SetupTldrawPage({ params }: { params: { roomid: string } }) {
  const roomid = await params.roomid;
  
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <TldrawMultiplayer roomId={roomid} />
    </div>
  )
}