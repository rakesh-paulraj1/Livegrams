import { TldrawMultiplayer } from "../../../components/TldrawMultiplayer";

export default function SetupTldrawPage({ params }: { params: { roomid: string } }) {
  const { roomid } =  params;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <TldrawMultiplayer roomId={roomid} />
    </div>
  );
}