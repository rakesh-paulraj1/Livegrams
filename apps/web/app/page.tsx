"use client"
import React, { useState } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Users, 
  Brain, 
  Palette, 
  Zap, 
  ArrowRight, 
  CheckCircle,
  Play,
  Star,
  X,
  Plus,
  Hash
} from 'lucide-react';
import { useSession } from 'next-auth/react';

function App() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [joinroom, setjoinroom] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleCreateRoom = async (roomName: string) => {
    if (!roomName.trim()) return;
    
    try {
      const response = await fetch(`/api/server/createroom/${roomName}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        router.push(`/collab/${data.roomId}`);
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
        router.push(`/collab/${data.roomId}`);
      } else {
        alert(data.message || 'Failed to join room. Please check the room ID and try again.');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Network error. Please check your connection and try again.');
    }
  };

  return (
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
              {/* Create Room Section */}
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
     
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                DrawMind
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              {status === "authenticated" && session?.user?.image ? (
                <div className="flex items-center space-x-2">
                
                  <Image
                       src={session?.user?.image ?? ""}
                       className="h-7 w-7 flex-shrink-0 rounded-full"
                       width={50}
                       height={50}
                       alt="Avatar"
                     />
                </div>
              ) : (
                <button className="text-gray-600 hover:text-gray-900 transition-colors" onClick={()=>signIn()}>Sign In</button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-purple-50 border border-purple-200 rounded-full text-purple-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              Now with AI-Powered Mind Mapping
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Draw Ideas,
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {" "}Create Magic
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              The ultimate collaborative drawing tool that transforms your sketches into intelligent mind maps. 
              Create, collaborate, and think visually with the power of AI.
            </p>

            {/* Main CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button 
                onClick={() => setIsDialogOpen(true)}
                className="group bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
              >
                <Users className="w-5 h-5 mr-2" />
                Create Room
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="group bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center">
                <Brain className="w-5 h-5 mr-2" />
                AI Mind Maps
                <Sparkles className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
              </button>
            </div>

            {/* Demo Preview */}
            <div className="relative max-w-5xl mx-auto">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200 shadow-2xl">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="bg-white rounded-lg h-96 flex items-center justify-center border border-gray-200">
                  <div className="text-center">
                    <Play className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Interactive Demo</p>
                    <p className="text-sm text-gray-500">Click to see DrawMind in action</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Lightning Fast</h4>
              <p className="text-gray-600">Optimized performance for smooth drawing and instant AI responses.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Palette className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Rich Tools</h4>
              <p className="text-gray-600">Complete drawing toolkit with shapes, text, colors, and more.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Premium Quality</h4>
              <p className="text-gray-600">Export high-resolution images and PDFs for professional use.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Ideas?
          </h2>
          <p className="text-xl text-purple-200 mb-12">
            Join thousands of creators, teams, and thinkers who use DrawMind to bring their ideas to life.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => setIsDialogOpen(true)}
              className="group bg-white text-purple-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
            >
              <Users className="w-5 h-5 mr-2" />
              Create Room Now
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="group bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-emerald-400 hover:to-teal-400 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              Try AI Mind Maps
              <Sparkles className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
            </button>
          </div>
          
          <p className="text-sm text-purple-300 mt-6">
            No credit card required • Free to start • Premium features available
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">DrawMind</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                The ultimate collaborative drawing and AI mind mapping platform for creative teams and individuals.
              </p>
            </div>
            
          
            
            
            
           
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 DrawMind. All rights reserved. Built with ❤️ for creative minds.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
