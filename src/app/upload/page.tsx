// src/app/upload/page.tsx
"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FloatingInput } from "@/components/FloatingInput";

export default function UploadPage() {
  const [file, setFile]               = useState<File | null>(null);
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]       = useState<string | null>(null);
  const [categories, setCategories]   = useState<{ id: string; name: string }[]>([]);
  const [progress, setProgress]       = useState<"idle" | "loading" | "done">("idle");
  const [error, setError]             = useState<string | null>(null);
  const router                        = useRouter();

  // 1) Kategóriák betöltése egyszer
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });
      if (data) {
        setCategories(data);
        if (!category && data.length) setCategory(data[0].id);
      }
      if (error) console.error("Category load error:", error);
    })();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  // 2) Upload + DB + thumb API
  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file || !title.trim() || !description.trim() || !category) {
      setError("Kérlek, töltsd ki az összes mezőt és válassz videót!");
      return;
    }

    try {
      setProgress("loading");

      // 2.1 Feltöltés
      const ext      = file.name.split(".").pop();
      const filePath = `${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase
        .storage
        .from("videos")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (uploadErr || !uploadData) throw new Error(uploadErr?.message || "Fájl feltöltése sikertelen");

      // 2.2 Publikus URL
      const { data: { publicUrl } } = supabase
        .storage
        .from("videos")
        .getPublicUrl(filePath);

      // 2.3 DB insert
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Nem vagy bejelentkezve");
      const { data: inserted, error: insertErr } = await supabase
        .from("videos")
        .insert([{
          title:       title.trim(),
          description: description.trim(),
          category_id: category,
          user_id:     session.user.id,
          views:       0,
          video_url:   publicUrl,
          created_at:  new Date().toISOString(),
        }])
        .select("id")
        .single();
      if (insertErr || !inserted?.id) throw new Error(insertErr?.message || "Adatbázis mentés sikertelen");

      // 2.4 Thumbnail API
      const thumbRes = await fetch("/api/generate-thumbnail", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ videoPath: filePath, videoId: inserted.id }),
      });
      if (!thumbRes.ok) {
        const errJson = await thumbRes.json();
        console.error("Thumbnail API error:", errJson);
        throw new Error(errJson.error || "Bélyegkép generálása sikertelen");
      }

      setProgress("done");
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("UploadPage error:", err);
      setError(err instanceof Error ? err.message : "Ismeretlen hiba");
      setProgress("idle");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6 relative">
      {/* === Modal spinner overlay === */}
      {progress === "loading" && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
          <p className="text-white mt-4">Feltöltés folyamatban…</p>
        </div>
      )}

      <form
        onSubmit={handleUpload}
        className="w-full max-w-xl bg-[#1c1c1c] rounded-2xl shadow-xl p-8 space-y-6 z-10"
      >
        {/* Header */}
        <h1 className="text-3xl font-bold text-white text-center">
          Új videó feltöltése
        </h1>

        {/* Title */}
        <FloatingInput
          label="Videó címe"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />

        {/* Description */}
        <div className="relative">
          <textarea
            rows={4}
            placeholder="Leírás"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="peer w-full bg-[#2a2a2a] border border-gray-600 rounded-xl pt-6 pb-4 px-4 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            required
          />
          <label className="absolute left-4 top-3 text-gray-400 pointer-events-none transition-all peer-placeholder-shown:top-6 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-400">
            Rövid leírás
          </label>
        </div>

        {/* Category */}
        <select
          value={category || ""}
          onChange={e => setCategory(e.target.value)}
          className="w-full bg-[#2a2a2a] border border-gray-600 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          required
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* File picker */}
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-xl py-6 text-gray-400 hover:border-blue-400 hover:text-blue-300 transition">
          <span>
            {file ? file.name : "Kattints ide a videó feltöltéséhez!"}
          </span>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="sr-only"
            required
          />
        </label>

        {/* Errors */}
        {error && <p className="text-center text-red-500">{error}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={progress === "loading"}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
        >
          Feltöltés
        </button>
      </form>
    </div>
  );
}
