// src/components/Navbar.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { UserCircle, Menu, X, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [username, setUsername]       = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef  = useRef<HTMLDivElement>(null);
  const router        = useRouter();

  // Profiladatok betöltése
  const fetchProfile = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    setIsLoggedIn(!!session);
    if (session?.user) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", session.user.id)
        .single();
      if (!error && profile) {
        setUsername(profile.username);
        setAvatarUrl(profile.avatar_url);
      }
    } else {
      setUsername(null);
      setAvatarUrl(null);
    }
  };

  // mount + auth változás + külső "profile-updated" esemény
  useEffect(() => {
    fetchProfile();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });
    const onProfileUpdated = () => {
      fetchProfile();
    };
    window.addEventListener("profile-updated", onProfileUpdated);
    return () => {
      sub?.subscription.unsubscribe();
      window.removeEventListener("profile-updated", onProfileUpdated);
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Kijelentkezés hiba:", error.message);
      return;
    }
    router.replace("/auth/login");
  };

  // kattintáson kívüli zárás
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        menuOpen &&
        !desktopMenuRef.current?.contains(t) &&
        !mobileMenuRef.current?.contains(t)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-gradient-to-r from-indigo-950 via-black to-indigo-950 bg-opacity-75 shadow-lg h-16">
      <div className="container mx-auto relative flex items-center justify-between h-full px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 h-full">
          <Image
            src="/blipblop_big_nobg.png"
            alt="BlipBlop Logo"
            width={64}
            height={64}
            className="hover:scale-110 transition-transform duration-300"
            priority
          />
        </Link>

        {/* Title - only on desktop, centered */}
        <div className="hidden md:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Link href="/" className="text-white text-xl font-semibold hover:text-indigo-300 transition">
            blipblop
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          {!isLoggedIn ? (
            <Link
              href="/auth/login"
              className="text-white hover:text-indigo-300 font-semibold transition"
            >
              Bejelentkezés
            </Link>
          ) : (
            <>
              <Link
                href="/upload"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-xl transition"
              >
                Feltöltés
              </Link>
              <div className="relative" ref={desktopMenuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-700 hover:bg-indigo-600 overflow-hidden shadow-md transition"
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <UserCircle className="text-white" size={28} />
                  )}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#1f1f1f] rounded-lg shadow-xl overflow-hidden animate-fadeInScale">
                    {username && (
                      <div className="px-4 py-2 text-sm text-gray-200 border-b border-gray-700">
                        {username}
                      </div>
                    )}
                    <Link
                      href="/"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-white hover:bg-indigo-500 transition"
                    >
                      Kezdőlap
                    </Link>
                    <Link
                      href="/dashboard?tab=videos"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-white hover:bg-indigo-500 transition"
                    >
                      Saját videóim
                    </Link>
                    <Link
                      href="/dashboard?tab=profile"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-white hover:bg-indigo-500 transition"
                    >
                      Profil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white hover:bg-indigo-500 transition"
                    >
                      <LogOut size={16} /> Kijelentkezés
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        {isLoggedIn && (
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden text-white p-2 hover:text-indigo-300 transition"
            aria-label="Mobil menü"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>

      {/* Mobile Menu */}
      {isLoggedIn && menuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden bg-[#1a1a1a] px-6 py-4 shadow-lg animate-slideDown space-y-2"
        >
          {username && (
            <div className="text-sm text-gray-200 border-b border-gray-700 pb-2">
              {username}
            </div>
          )}
          <Link href="/" onClick={() => setMenuOpen(false)} className="block px-6 py-3 text-white hover:bg-[#333] rounded-lg transition">
            Kezdőlap
          </Link>
          <Link href="/upload" onClick={() => setMenuOpen(false)} className="block px-6 py-3 text-white hover:bg-[#333] rounded-lg transition">
            Feltöltés
          </Link>
          <Link href="/dashboard?tab=videos" onClick={() => setMenuOpen(false)} className="block px-6 py-3 text-white hover:bg-[#333] rounded-lg transition">
            Saját videóim
          </Link>
          <Link href="/dashboard?tab=profile" onClick={() => setMenuOpen(false)} className="block px-6 py-3 text-white hover:bg-[#333] rounded-lg transition">
            Profil
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-6 py-3 text-white hover:bg-[#333] rounded-lg transition"
          >
            <LogOut size={16} /> Kijelentkezés
          </button>
        </div>
      )}
    </nav>
  );
}
