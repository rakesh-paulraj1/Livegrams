"use client"
import React, { useEffect, useState } from "react";
import { useSession } from 'next-auth/react'
import { useRouter } from "next/navigation";
import { X, Plus, Hash } from "lucide-react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import { SafariDemo } from "../components/Safari";
import { AndroidDemo } from "../components/Android";
import FeatureCluster from "../components/FeatureCluster";
import { StickyFooter } from "../components/ui/Stickyfooter";
import Link from "next/link";
import Toast from "../components/ui/Toast";
import Image from "next/image";
function generateSlug() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const seg = (n: number) =>
    Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
}

export default function App() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [joinroom, setJoinRoom] = useState("");
  const [generatedRoomId, setGeneratedRoomId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBoardType, setSelectedBoardType] = useState<"interactive" | "ai">("interactive");
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "info"|"error"|"success"|"loading" } | null>(null);

  const router = useRouter();
  const { data: session, status } = useSession()
  const [rooms, setRooms] = useState<{ id: string; name?: string }[]>([])
  const [roomsLoading, setRoomsLoading] = useState(false)

  useEffect(() => {
    if (isDialogOpen) {
      setGeneratedRoomId(generateSlug());
    } else {
      setGeneratedRoomId("");
    }
  }, [isDialogOpen]);

  useEffect(() => {
    if (!isDialogOpen) return
    const email = session?.user?.email
    if (!email) return

    let cancelled = false
    ;(async () => {
      setRoomsLoading(true)
      try {
        const res = await fetch(`/api/rooms`)
        const data = await res.json()
        if (!cancelled) setRooms(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) setRooms([])
        console.error('Failed to fetch rooms', err)
      } finally {
        if (!cancelled) setRoomsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isDialogOpen, session?.user?.email])

  const copyRoomId = async () => {
    if (!generatedRoomId) return;
    try {
      await navigator.clipboard.writeText(generatedRoomId);
      setCopiedRoomId(true);
      setTimeout(() => setCopiedRoomId(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCreateRoom = async () => {
    if (!generatedRoomId) return;
    setIsCreating(true);
    setToast({ message: "Creating room...", type: "loading" });
    try {
      const response = await fetch(`/api/server/createroom/${generatedRoomId}`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setToast({ message: "Room created! Redirecting...", type: "success" });
        setTimeout(() => {
          router.push(`/setup/${data.slug ?? generatedRoomId}`);
        }, 800);
      } else {
        setIsCreating(false);
        setToast({ message: data.message || "Failed to create room. Please try again.", type: "error" });
      }
    } catch (error) {
      console.error("Error creating room:", error);
      setIsCreating(false);
      setToast({ message: "Network error. Please check your connection and try again.", type: "error" });
    }
  };

  const handleJoinRoom = async (id: string) => {
    if (!id.trim()) {
      setToast({ message: "Please enter a valid room ID.", type: "error" });
      return;
    }
    setToast({ message: "Joining room...", type: "loading" });
    try {
      const response = await fetch(`/api/server/joinroom/${id}`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setToast({ message: "Joined room! Redirecting...", type: "success" });
        setTimeout(() => {
          router.push(`/setup/${id}`);
        }, 800);
      } else {
        setToast({ message: data.message || "Failed to join room. Please check the room ID and try again.", type: "error" });
      }
    } catch (error) {
      console.error("Error joining room:", error);
      setToast({ message: "Network error. Please check your connection and try again.", type: "error" });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#faf9f6] relative">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
        radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0),
        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px),
        repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)
      `,
          backgroundSize: "8px 8px, 32px 32px, 32px 32px",
        }}
      />

      <div className="min-h-screen bg-white">
        {isDialogOpen && (
          <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Choose Your Action</h2>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3 items-center">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBoardType("interactive")}
                      className={`px-4 py-2 rounded-md border border-gray-300 text-gray-800 ${
                        selectedBoardType === "interactive" ? "bg-gray-200" : "bg-white"
                      }`}
                    >
                      Interactive Board
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBoardType("ai")}
                      className={`px-4 py-2 rounded-md border border-gray-300 text-gray-800 ${
                        selectedBoardType === "ai" ? "bg-gray-200" : "bg-white"
                      }`}
                    >
                      AI Whiteboard
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Choose a board type. Select &quot;Interactive Board&quot; to create or join a collaborative session, or
                  &quot;AI Whiteboard&quot; to use an AI powered whiteboard.
                </p>

                {selectedBoardType === "interactive" ? (
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-xl p-4 bg-white">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                          <Plus className="w-4 h-4 text-gray-700" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Create New Room</h3>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">Start a new collaborative drawing session</p>

                      <div className="mb-3">
                        <label className="text-xs text-gray-500 block mb-1">Room ID (auto-generated)</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 break-words">
                            <code className="select-all text-sm">{generatedRoomId || "—"}</code>
                          </div>
                          <button
                            type="button"
                            onClick={copyRoomId}
                            className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm"
                          >
                            {copiedRoomId ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <button
                            onClick={handleCreateRoom}
                            disabled={!generatedRoomId || isCreating}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-gray-200 text-gray-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isCreating ? "Creating..." : "Create Room"}
                          </button>
                          <button
                            onClick={() => setGeneratedRoomId(generateSlug())}
                            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4 bg-white">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                          <Hash className="w-4 h-4 text-gray-700" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Join Existing Room</h3>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">Enter a room ID to join an existing session</p>
                      {status === 'authenticated' && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-800 mb-2">Your rooms</p>
                          {roomsLoading ? (
                            <p className="text-xs text-gray-500">Loading...</p>
                          ) : rooms.length ? (
                           <div className="mb-3 h-27 overflow-y-auto">
  <div className="grid grid-cols-1 gap-2">
    {rooms.map((r) => (
      <button
        key={r.id}
        onClick={() => handleJoinRoom(r.id)}
        className="text-left px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm"
      >
        {r.name ?? r.id}
      </button>
    ))}
  </div>
</div>
                          ) : (
                            <p className="text-xs text-gray-500">You have not created any rooms yet.</p>
                          )}
                        </div>
                      )}
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Enter room ID..."
                          value={joinroom}
                          onChange={(e) => setJoinRoom(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && joinroom.trim()) {
                              handleJoinRoom(joinroom);
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleJoinRoom(joinroom)}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-gray-200 text-gray-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Join Room
                          </button>
                          <button
                            onClick={() => setJoinRoom("")}
                            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl p-4 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Whiteboard</h3>
                    <p className="text-gray-600 text-sm mb-4">Use our AI to generate an instant whiteboard from prompts or ideas.</p>
                    <div className="flex gap-2">
                      <Link
                        href="/generative"
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-gray-200 text-gray-900 font-semibold"
                      >
                        Start AI Whiteboard
                      </Link>
                     
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <Header />

      
        <Hero onStartClick={() => setIsDialogOpen(true)} />

        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
            <div className="hidden md:flex w-full justify-center">
              
              <SafariDemo />
            </div>

            <div className="flex md:hidden w-full justify-center">
              <AndroidDemo />
            </div>
          </div>
        </section>

        <FeatureCluster />

        <StickyFooter />
      </div>
    </div>
  );
}
