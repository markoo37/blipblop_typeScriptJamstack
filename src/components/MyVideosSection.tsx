// src/components/MyVideosSection.tsx

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

interface Video {
  id: string;
  title: string;
  created_at: string;
  thumbnail_url?: string;
}

export function MyVideosSection() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from<Video>("videos")
        .select("id, title, created_at, thumbnail_url")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (data) setVideos(data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
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

  if (videos.length === 0) {
    return <p className="text-gray-400">Még nincs feltöltött videód.</p>;
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-6 text-white">Saját videóim</h1>
      <div className="flex flex-col gap-4">
        {videos.map(video => (
          <Link
            key={video.id}
            href={`/videos/${video.id}`}
            className="flex items-center gap-4 bg-[#2a2a2a] p-4 rounded-xl shadow-md hover:bg-[#333] transition-all duration-300"
          >
            {video.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="h-20 w-32 object-cover rounded"
              />
            ) : (
              <div className="bg-gray-700 h-20 w-32 rounded" />
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
