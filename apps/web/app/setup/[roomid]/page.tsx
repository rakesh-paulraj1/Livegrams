import { TldrawMultiplayer } from "../../../components/TldrawMultiplayer";
import { prismaClient } from '@repo/db/client';

export default async function SetupTldrawPage({ params }: { params: Promise<{ roomid: string }> }) {
 
  const { roomid: roomSlug } =  await params;

  const room = await prismaClient.room.findUnique({ where: { slug: roomSlug } });

  if (!room) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold">Room not found</h2>
        <p className="text-gray-600">The room &quot;{roomSlug}&quot; does not exist.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <TldrawMultiplayer roomSlug={String(roomSlug)} roomId={String(room.id)} />
    </div>
  );
}