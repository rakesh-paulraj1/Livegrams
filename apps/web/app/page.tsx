"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Users, 
  Brain, 
  Palette, 
  Zap, 
  ArrowRight, 
  CheckCircle,
  Star,
  X,
  Plus,
  Hash
} from 'lucide-react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import { SafariDemo } from '../components/Safari';
import { AndroidDemo } from '../components/Android';
import FeatureCluster from '../components/FeatureCluster';
import { StickyFooter } from '../components/ui/Stickyfooter';

function App() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [joinroom, setjoinroom] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleCreateRoom = async (roomName: string) => {
    if (!roomName.trim()) return;
    
    try {
      const response = await fetch(`/api/server/createroom/${roomName}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        router.push(`/setup/${data.roomId}`);
      } else {
        setIsCreating(false);
        alert(data.message || 'Failed to create room. Please try again.');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      setIsCreating(false);
      alert('Network error. Please check your connection and try again.');
    }
  };

  const handleJoinRoom = async (joinroom: string) => {
    if (!joinroom.trim()) return;
    
    try {
      const response = await fetch(`/api/server/joinroom/${joinroom}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        router.push(`/setup/${data.roomId}`);
      } else {
        alert(data.message || 'Failed to join room. Please check the room ID and try again.');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Network error. Please check your connection and try again.');
    }
  };

     {/* Your Content/Components */}

  return (
    <div className="min-h-screen w-full bg-[#faf9f6] relative">
  {/* Paper Texture */}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Create New Room</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">Start a new collaborative drawing session</p>
                <div className="space-y-3">
                  <input
  type="text"
  placeholder="Enter room name..."
  value={roomName}
  onChange={(e) => setRoomName(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && roomName.trim()) {
      setIsCreating(true);
      handleCreateRoom(roomName);
    }
  }}
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
/>
                  <button
                    onClick={() => {
                      setIsCreating(true);
                      handleCreateRoom(roomName);
                    }}
                    disabled={!roomName.trim() || isCreating}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isCreating ? 'Creating...' : 'Create Room'}
                  </button>
                </div>
              </div>

              {/* Join Room Section */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mr-3">
                    <Hash className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Join Existing Room</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">Enter a room ID to join an existing session</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter room ID..."
                    value={joinroom}
                    onChange={(e) => setjoinroom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && joinroom.trim()) {
                        handleJoinRoom(joinroom);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    onClick={()=>handleJoinRoom(joinroom)}
                    // disabled={!joinroom.trim()}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Join Room
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
     
      <Header />

      {/* Hero Section */}
      <Hero onStartClick={() => setIsDialogOpen(true)} />

      {/* Device preview: show Safari on md+ and Android on small screens */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
          {/* Desktop / Tablet preview */}
          <div className="hidden md:flex w-full justify-center">
            <SafariDemo />
          </div>

          {/* Mobile preview */}
          <div className="flex md:hidden w-full justify-center">
            <AndroidDemo />
          </div>
        </div>
      </section>

  {/* Feature cluster (animated) placed below device previews */}
  <FeatureCluster />

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Two Powerful Ways to Create
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you want to collaborate in real-time or harness AI for instant mind maps, 
              DrawMind has you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Collaborative Drawing */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Collaborative Rooms</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Create shared drawing spaces where teams can sketch, brainstorm, and iterate together in real-time. 
                Perfect for workshops, design sessions, and creative collaboration.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Real-time collaboration
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Unlimited canvas space
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Voice & video chat
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Export & share easily
                </li>
              </ul>
              <button 
                onClick={() => setIsDialogOpen(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
              >
                Start Collaborating
              </button>
            </div>

            {/* AI Mind Maps */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Mind Maps</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Transform your ideas into stunning mind maps instantly. Our AI understands your concepts 
                and creates beautiful, organized visual representations of your thoughts.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Instant AI generation
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Smart topic suggestions
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Auto-organize content
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  Beautiful templates
                </li>
              </ul>
              <button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:scale-105">
                Generate with AI
              </button>
            </div>
          </div>

          {/* Additional Features */}
         
        </div>
      </section>

      {/* CTA Section */}
     
      {/* Footer */}
<StickyFooter/>
    </div>
    </div>
  );
}

export default App;
