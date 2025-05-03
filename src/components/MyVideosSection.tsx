"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image"; // ← import Next’s Image

interface Video {
  id: string;
  title: string;
  created_at: string;
  thumbnail_url?: string;
}
type Session = { user: { id: string } } | null;

// Fetch helpers
const fetchSession = async (): Promise<Session> => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};
const fetchMyVideos = async (userId: string): Promise<Video[]> => {
  const { data, error } = await supabase
    .from("videos")
    .select("id, title, created_at, thumbnail_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Video[];
};

export function MyVideosSection() {
  // 1) Session lekérése
  const {
    data: session,
    mutate: mutateSession,
    error: sessionError
  } = useSWR<Session>("session", fetchSession, { revalidateOnFocus: false });
  if (sessionError) throw sessionError;
  const userId = session?.user?.id ?? null;

  // 2) Videók lekérése a userId alapján
  const videosKey = userId ? ["myVideos", userId] : null;
  const {
    data: videos,
    error: videosError,
    isLoading: loadingVideos,
    mutate: refreshVideos
  } = useSWR<Video[]>(videosKey, () => fetchMyVideos(userId!), {
    revalidateOnFocus: false
  });

  // 3) Ha auth változik (átjelentkezés), újra-fetch
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      mutateSession();
      if (userId) refreshVideos();
    });
    return () => { sub?.subscription.unsubscribe(); };
  }, [mutateSession, refreshVideos, userId]);

  if (loadingVideos) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-6 text-white">Saját videóim</h1>
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-[#2a2a2a] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (videosError) return <p className="text-red-500">Videók betöltése sikertelen.</p>;
  if (videos && videos.length === 0) return <p className="text-gray-400">Még nincs feltöltött videód.</p>;

  return (
    <div>
      <h1 className="text-4xl font-bold mb-6 text-white">Saját videóim</h1>
      <div className="flex flex-col gap-4">
        {videos?.map(video => (
          <Link
            key={video.id}
            href={`/videos/${video.id}`}
            className="flex items-center gap-4 bg-[#2a2a2a] p-4 rounded-xl shadow-md hover:bg-[#333] transition-all duration-300"
          >
            {video.thumbnail_url ? (
              <div className="relative h-20 w-32 flex-shrink-0">
                {/* ← Use Next/Image for LCP and bandwidth optimization */}
                <Image
                  src={video.thumbnail_url}
                  alt={video.title}
                  fill
                  className="object-cover rounded"
                  unoptimized={false} // or true if you want to bypass loader
                />
              </div>
            ) : (
              <div className="bg-gray-700 h-20 w-32 rounded flex-shrink-0" />
            )}
            <div>
              <h2 className="text-xl font-semibold text-white">{video.title}</h2>
              <p className="text-gray-400 text-sm">
                Feltöltve: {new Date(video.created_at).toLocaleDateString("hu-HU")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
