"use client";

// import { WS_URL } from "@/config";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "./Canvas";

import { useSession } from "next-auth/react";
export function CanvasWithWebSocket({roomId}: {roomId: string}) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const session=useSession()
    const WS_URL="ws://localhost:8080"


    useEffect(() => {
        if (!session.data || !session.data.accessToken) {
            console.error("Session or access token is missing.");
            return;
        }

        const ws = new WebSocket(`${WS_URL}?token=${session.data.accessToken}`);

        ws.onopen = () => {
            setSocket(ws);
            const data = JSON.stringify({
                type: "join_room",
                roomId
            });
            console.log(data);
            ws.send(data);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = (event) => {
            console.log('WebSocket closed:', event.code, event.reason);
        };
        
    }, [session.data, roomId])
   
    if (!socket) {
        return <div>
            Connecting to server....
        </div>
    }

    return <div>
        <Canvas roomId={roomId} socket={socket} />
    </div>
}