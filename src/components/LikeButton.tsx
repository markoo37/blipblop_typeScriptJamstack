// src/components/LikeButton.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Heart } from "lucide-react";

interface LikeButtonProps {
  videoId: string;
}

export function LikeButton({ videoId }: LikeButtonProps) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 0) Jelenlegi user lekérése
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
  }, []);

  // 1) Betöltéskor csak a lájkszám
  useEffect(() => {
    if (!videoId) return;
    (async () => {
      const { count } = await supabase
        .from("likes")
        .select("*", { head: true, count: "exact" })
        .eq("video_id", videoId);
      setCount(count ?? 0);
    })();
  }, [videoId]);

  // 2) Ha userId is megvan, lekérjük, hogy ő lájkolta-e
  useEffect(() => {
    if (!videoId || !userId) return;
    (async () => {
      const { data: existing, error } = await supabase
        .from("likes")
        .select("id", { count: "exact" })
        .eq("video_id", videoId)
        .eq("user_id", userId)
        .maybeSingle();
      setLiked(!!existing);
    })();
  }, [videoId, userId]);

  // 3) Toggle like/unlike
  const toggle = async () => {
    if (!userId || busy) return;
    setBusy(true);

    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("video_id", videoId)
        .eq("user_id", userId);
      setCount(c => c - 1);
      setLiked(false);
    } else {
      await supabase.from("likes").insert({ video_id: videoId, user_id: userId });
      setCount(c => c + 1);
      setLiked(true);
    }

    setBusy(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="flex items-center gap-1 text-white hover:text-red-400 transition disabled:opacity-50"
    >
      <Heart
        size={20}
        className={liked ? "text-red-500 fill-current" : "text-white"}
      />
      <span>{count}</span>
    </button>
  );
}
