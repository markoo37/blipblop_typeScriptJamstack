"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Video {
  id: string;
  title: string;
  description: string;
  created_at: string;
  views: number;
  category_id: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string };
}

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const router = useRouter();

  // 0) Lekérjük a jelenlegi user ID-t
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user.id ?? null);
    });
  }, []);

  // 1) Videó lekérése + view++
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, description, created_at, views, category_id")
        .eq("id", id)
        .single();
      if (error || !data) {
        router.replace("/");
        return;
      }
      setVideo(data);
      setLoadingVideo(false);
      await supabase
        .from("videos")
        .update({ views: data.views + 1 })
        .eq("id", id);
    })();
  }, [id, router]);

  // 2) Kommentek lekérése
  const fetchComments = async () => {
    if (!id) return;
    setLoadingComments(true);
    const { data, error } = await supabase
      .from<Comment>("comments")
      .select("id, content, created_at, user_id, profiles(username)")
      .eq("video_id", id)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
    setLoadingComments(false);
  };

  useEffect(() => {
    fetchComments();
  }, [id]);

  // 3) Új komment beküldése
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!id || !content || !currentUserId) return;
    await supabase.from("comments").insert([
      { video_id: id, user_id: currentUserId, content }
    ]);
    setNewComment("");
    fetchComments();
  };

  // 4) Komment törlése
  const handleDelete = async (commentId: string) => {
    await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    fetchComments();
  };

  // Loader vagy eltűnt video esetén
  if (loadingVideo || video === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-pulse h-64 w-full max-w-2xl bg-gray-700 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-3xl mx-auto">
        {/* Videó lejátszó */}
        <div className="bg-black w-full h-0 pb-[56.25%] relative rounded-lg overflow-hidden mb-6">
          <video controls className="absolute inset-0 w-full h-full">
            <source src={`/api/videos/${video.id}`} type="video/mp4" />
            A böngésződ nem támogatja a videó lejátszást.
          </video>
        </div>

        {/* Videó adatai */}
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
          {video.title}
        </h1>
        <p className="text-sm text-gray-400 mb-4">
          Feltöltve: {new Date(video.created_at).toLocaleDateString("hu-HU")} • {video.views + 1} megtekintés
        </p>
        <p className="text-gray-200 whitespace-pre-wrap mb-8">
          {video.description}
        </p>

        {/* Komment szekció */}
        <section className="border-t border-gray-700 pt-6">
          <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">Kommentek</h2>

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
              className="bg-blue-500 hover:bg-blue-400 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              Küldés
            </button>
          </form>

          {/* Komment lista */}
          {loadingComments ? (
            <p className="text-gray-400">Kommentek betöltése…</p>
          ) : comments.length === 0 ? (
            <p className="text-gray-400">Még nincs komment.</p>
          ) : (
            <ul className="space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="bg-[#1f1f1f] p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-gray-300">
                      {c.profiles.username} • {new Date(c.created_at).toLocaleString("hu-HU")}
                    </p>
                    {/* Törlés gomb csak szerzőnek */}
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
