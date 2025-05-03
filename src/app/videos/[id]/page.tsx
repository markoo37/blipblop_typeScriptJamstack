"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { supabase } from "@/lib/supabaseClient";
import { LikeButton } from "@/components/LikeButton";

interface Video {
  id: string;
  title: string;
  description: string;
  created_at: string;
  views: number;
  category_id: string;
  video_url: string;
  user_id: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string };
}

// SWR-fetcherek
const fetchVideo = async (id: string): Promise<Video> => {
  const { data, error } = await supabase
    .from<Video>("videos")
    .select("id, title, description, created_at, views, category_id, video_url, user_id")
    .eq("id", id)
    .single();
  if (error || !data) throw error || new Error("Video not found");
  // views növelése
  const newViews = data.views + 1;
  await supabase.from("videos").update({ views: newViews }).eq("id", id);
  return { ...data, views: newViews };
};

const fetchComments = async (id: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from<Comment>("comments")
    .select("id, content, created_at, user_id, profiles(username)")
    .eq("video_id", id)
    .order("created_at", { ascending: true });
  if (error || !data) throw error || new Error("Comments fetch error");
  return data;
};

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Videó adat + views increment
  const {
    data: video,
    error: videoError,
    isLoading: loadingVideo
  } = useSWR<Video>(id ? ["video", id] : null, () => fetchVideo(id!));

  // Kommentek lekérése
  const {
    data: comments,
    error: commentsError,
    isLoading: loadingComments,
    mutate: refreshComments
  } = useSWR<Comment[]>(id ? ["comments", id] : null, () => fetchComments(id!));

  // Jelenlegi user ID beállítása
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user.id ?? null);
    });
  }, []);

  // Ha a videó nem található, visszadobunk a főoldalra
  useEffect(() => {
    if (videoError) {
      router.replace("/");
    }
  }, [videoError, router]);

  // Új komment beküldése
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!id || !content || !currentUserId) return;

    setNewComment("");
    await supabase
      .from("comments")
      .insert([{ video_id: id, user_id: currentUserId, content }]);
    refreshComments();
  };

  // Komment törlése
  const handleDelete = async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
    refreshComments();
  };

  // Videó törlése (csak ownernek), storage-ból is
  const handleVideoDelete = async () => {
    if (!video) return;
    if (!confirm("Biztosan törlöd ezt a videót?")) return;

    // Bucket-beli fájl törlése
    const path = video.video_url
      .split("/")
      .slice(-1)[0]
      .split("?")[0];
    const { error: storageError } = await supabase
      .storage
      .from("videos")
      .remove([path]);
    if (storageError) {
      alert("Hiba a video tárolóbéli törlése során: " + storageError.message);
      return;
    }

    // Metadata törlése
    const { error: dbError } = await supabase
      .from("videos")
      .delete()
      .eq("id", id);
    if (dbError) {
      alert("Hiba a video adatbázisbéli törlése során: " + dbError.message);
      return;
    }

    router.replace("/");
  };

  // Loader
  if (loadingVideo || !video) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-pulse h-64 w-full max-w-2xl bg-gray-700 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-3xl mx-auto">
        {/* Videólejátszó */}
        <div className="bg-black w-full h-0 pb-[56.25%] relative rounded-lg overflow-hidden mb-6">
          <video controls className="absolute inset-0 w-full h-full">
            <source src={video.video_url} type="video/mp4" />
            A böngésződ nem támogatja a videó lejátszást.
          </video>
        </div>
        {/* Lájk gomb */}
        <div className="flex items-center gap-4 mb-6">
          <LikeButton videoId={video.id} />
        {/* akár share / bookmark gombok is jöhetnek ide */}
      </div>
        {/* Videó adatai */}
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
          {video.title}
        </h1>
        <p className="text-sm text-gray-400 mb-4">
          Feltöltve:{" "}
          {new Date(video.created_at).toLocaleDateString("hu-HU")} •{" "}
          {video.views} megtekintés
        </p>
        <p className="text-gray-200 whitespace-pre-wrap mb-4">
          {video.description}
        </p>

        {/* Videó törlés gomb (csak owner) */}
        {currentUserId === video.user_id && (
          <button
            onClick={handleVideoDelete}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg mb-6"
          >
            Videó törlése
          </button>
        )}

        {/* Komment szekció */}
        <section className="border-t border-gray-700 pt-6">
          <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
            Kommentek
          </h2>

          {/* Új komment űrlap */}
          <form onSubmit={handleSubmit} className="mb-6">
            <textarea
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Írj kommentet..."
              className="w-full bg-[#2a2a2a] text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || !currentUserId}
              className="bg-blue-500 hover:bg-blue-400 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              Küldés
            </button>
          </form>

          {/* Komment lista */}
          {loadingComments ? (
            <p className="text-gray-400">Kommentek betöltése…</p>
          ) : comments && comments.length === 0 ? (
            <p className="text-gray-400">Még nincs komment.</p>
          ) : (
            <ul className="space-y-4">
              {comments?.map((c) => (
                <li key={c.id} className="bg-[#1f1f1f] p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-gray-300">
                      {c.profiles.username} •{" "}
                      {new Date(c.created_at).toLocaleString("hu-HU")}
                    </p>
                    {currentUserId === c.user_id && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-red-500 hover:text-red-700 text-sm ml-2"
                        title="Komment törlése"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                  <p className="text-white mt-1">{c.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
