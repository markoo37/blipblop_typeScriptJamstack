// src/components/Navbar.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { UserCircle, Menu, X } from "lucide-react";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [username, setUsername]       = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef  = useRef<HTMLDivElement>(null);

  // centralize profile fetch logic
  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
    if (session?.user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("username,avatar_url")
        .eq("id", session.user.id)
        .single();
      if (!error && data) {
        setUsername(data.username);
        setAvatarUrl(data.avatar_url);
      }
    } else {
      setUsername(null);
      setAvatarUrl(null);
    }
  };

  useEffect(() => {
    // initial load + auth changes
    fetchProfile();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    // listen to custom event from ProfileSection
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
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  // close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        menuOpen &&
        !desktopMenuRef.current?.contains(t) &&
        !mobileMenuRef.current?.contains(t)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <nav className="bg-[#1a1a1a] shadow-md relative z-50">
      <div className="container mx-auto flex items-center justify-between py-4 px-4 md:px-6">
        {/* mobile burger */}
        <div className="flex items-center">
          {isLoggedIn && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-white p-2 rounded transition"
              aria-label="Mobil menü"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>

        {/* logo */}
        <Link
          href="/"
          className="absolute left-1/2 transform -translate-x-1/2 text-white text-2xl font-bold hover:text-blue-400 transition"
        >
          blipblop
        </Link>

        {/* desktop menu */}
        <div className="flex items-center gap-6">
          {!isLoggedIn ? (
            <Link
              href="/auth/login"
              className="text-white hover:text-blue-400 font-semibold transition"
            >
              Bejelentkezés
            </Link>
          ) : (
            <div className="hidden md:flex items-center gap-6" ref={desktopMenuRef}>
              <Link
                href="/upload"
                className="bg-blue-500 hover:bg-blue-400 text-white font-semibold py-2 px-4 rounded-xl transition"
              >
                Feltöltés
              </Link>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-[#333] hover:bg-[#555] overflow-hidden"
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
                  <div className="absolute top-full right-0 mt-2 w-48 bg-[#1f1f1f] rounded-lg shadow-lg overflow-hidden animate-fadeInScale">
                    {username && (
                      <div className="px-4 py-2 text-sm text-gray-200 border-b border-gray-700">
                        {username}
                      </div>
                    )}
                    <Link
                      href="/"
                      className="block px-4 py-3 text-sm text-white hover:bg-blue-500 transition"
                      onClick={() => setMenuOpen(false)}
                    >
                      Kezdőlap
                    </Link>
                    <Link
                      href="/dashboard?tab=videos"
                      className="block px-4 py-3 text-sm text-white hover:bg-blue-500 transition"
                      onClick={() => setMenuOpen(false)}
                    >
                      Saját videóim
                    </Link>
                    <Link
                      href="/dashboard?tab=profile"
                      className="block px-4 py-3 text-sm text-white hover:bg-blue-500 transition"
                      onClick={() => setMenuOpen(false)}
                    >
                      Profil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-sm text-white hover:bg-blue-500 transition"
                    >
                      Kijelentkezés
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* mobile drawer */}
      {isLoggedIn && menuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden absolute top-full left-0 right-0 bg-[#1a1a1a] shadow-lg animate-slideDown"
        >
          {username && (
            <div className="px-6 py-3 text-sm text-gray-200 border-b border-gray-700">
              {username}
            </div>
          )}
          <Link
            href="/"
            className="block px-6 py-4 text-white hover:bg-[#333] transition"
            onClick={() => setMenuOpen(false)}
          >
            Kezdőlap
          </Link>
          <Link
            href="/upload"
            className="block px-6 py-4 text-white hover:bg-[#333] transition"
            onClick={() => setMenuOpen(false)}
          >
            Feltöltés
          </Link>
          <Link
            href="/dashboard?tab=videos"
            className="block px-6 py-4 text-white hover:bg-[#333] transition"
            onClick={() => setMenuOpen(false)}
          >
            Saját videóim
          </Link>
          <Link
            href="/dashboard?tab=profile"
            className="block px-6 py-4 text-white hover:bg-[#333] transition"
            onClick={() => setMenuOpen(false)}
          >
            Profil
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-6 py-4 text-white hover:bg-[#333] transition"
          >
            Kijelentkezés
          </button>
        </div>
      )}
    </nav>
  );
}
