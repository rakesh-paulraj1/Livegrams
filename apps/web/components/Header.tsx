"use client"
import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export default function Header() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [rooms, setRooms] = useState<{ id: string; name?: string }[]>([])
  const [roomsLoading, setRoomsLoading] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !isUserMenuOpen) return;
    let cancelled = false
    async function loadRooms() {
      setRoomsLoading(true)
      try {
        const owner = encodeURIComponent(session?.user?.email ?? '')
        const res = await fetch(`/api/rooms?owner=${owner}`)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (!cancelled) {
          
          setRooms(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) setRooms([])
        console.error(err)
      } finally {
        if (!cancelled) setRoomsLoading(false)
      }
    }
    loadRooms()
    return () => {
      cancelled = true
    }
  }, [isUserMenuOpen, status, session])

  const handleMobileNavClick = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 120;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-4 z-[9999] mx-auto hidden w-full max-w-5xl flex-row items-center justify-between rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg md:flex px-6 py-3">
        <Link className="flex items-center justify-center gap-2" href="/">
          <span className="text-lg font-semibold text-gray-900">Livegrams</span>
        </Link>

        <div className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-gray-600 transition duration-200 hover:text-gray-900 md:flex md:space-x-2">
        
       
         
        </div>

        <div className="flex items-center gap-4">
          {status === "authenticated" && session?.user?.image ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <Image
                  src={session?.user?.image ?? ""}
                  className="h-8 w-8 flex-shrink-0 rounded-full cursor-pointer"
                  width={32}
                  height={32}
                  alt="Avatar"
                />
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                  </div>
                  {/* User's rooms list */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">Your rooms</p>
                    {roomsLoading ? (
                      <p className="text-xs text-gray-500 mt-2">Loading...</p>
                    ) : rooms.length ? (
                      <ul className="max-h-40 overflow-auto mt-2 space-y-2">
                        {rooms.map((r) => (
                          <li key={r.id}>
                            <Link
                              href={`/setup/${r.id}`}
                              className="block text-sm text-gray-700 hover:bg-gray-50 px-2 py-1 rounded"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              {r.name ?? r.id}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2">You have not created any rooms yet.</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: '/' });
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
             
              <a
                onClick={() => signIn()}
                className="rounded-md font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-4 py-2 text-sm"
              >
                Log In 
              </a>
            </>
          )}
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-4 z-[9999] mx-4 flex w-auto flex-row items-center justify-between rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg md:hidden px-4 py-3">
        <Link className="flex items-center justify-center gap-2" href="/">
          <span className="text-lg font-semibold text-gray-900">Livegrams</span>
        </Link>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/50 border border-gray-200 transition-colors hover:bg-white/80"
          aria-label="Toggle menu"
        >
          <div className="flex flex-col items-center justify-center w-5 h-5 space-y-1">
            <span
              className={`block w-4 h-0.5 bg-gray-900 transition-all duration-300 ${isMobileMenuOpen ? "rotate-45 translate-y-1.5" : ""}`}
            ></span>
            <span
              className={`block w-4 h-0.5 bg-gray-900 transition-all duration-300 ${isMobileMenuOpen ? "opacity-0" : ""}`}
            ></span>
            <span
              className={`block w-4 h-0.5 bg-gray-900 transition-all duration-300 ${isMobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""}`}
            ></span>
          </div>
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm md:hidden">
          <div className="absolute top-20 left-4 right-4 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl p-6">
            <nav className="flex flex-col space-y-4">
              <button
                onClick={() => handleMobileNavClick("features")}
                className="text-left px-4 py-3 text-lg font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
              >
                Features
              </button>
              <button
                onClick={() => handleMobileNavClick("pricing")}
                className="text-left px-4 py-3 text-lg font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
              >
                Pricing
              </button>
              <button
                onClick={() => handleMobileNavClick("testimonials")}
                className="text-left px-4 py-3 text-lg font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
              >
                Testimonials
              </button>
              <button
                onClick={() => handleMobileNavClick("faq")}
                className="text-left px-4 py-3 text-lg font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
              >
                FAQ
              </button>
              <div className="border-t border-gray-200 pt-4 mt-4 flex flex-col space-y-3">
                {status === "authenticated" && session?.user ? (
                  <>
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        signOut({ callbackUrl: '/' });
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center px-4 py-3 text-lg font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      onClick={() => signIn()}
                      className="px-4 py-3 text-lg font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      Log In
                    </a>
                    <a
                      onClick={() => signIn()}
                      className="px-4 py-3 text-lg font-bold text-center bg-gradient-to-b from-gray-900 to-gray-800 text-white rounded-lg shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      Sign Up
                    </a>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
