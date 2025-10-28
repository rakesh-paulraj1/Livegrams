import { TldrawMultiplayer } from "../../../components/TldrawMultiplayer";
import { prismaClient } from '@repo/db/client';

export default async function SetupTldrawPage({ params }: { params: { roomid: string } }) {
  // Here params.roomid is the public room slug. We look up the internal numeric id
  // and pass that to the client-side Tldraw component which will use it for snapshots.
  const { roomid: roomSlug } = params;

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
      <TldrawMultiplayer roomId={String(room.id)} />
    </div>
  );
}