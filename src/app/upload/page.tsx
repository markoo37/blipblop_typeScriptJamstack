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

  // Kategóriák betöltése
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
      if (error) console.error("Cat load err:", error);
    })();
  }, [category]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file || !title.trim() || !description.trim() || !category) {
      setError("Töltsd ki az összes mezőt, és válassz fájlt!");
      return;
    }

    try {
      setProgress("loading");

      // 1) Fájlfeltöltés
      const ext      = file.name.split(".").pop();
      const filePath = `${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase
        .storage
        .from("videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr || !uploadData) {
        throw new Error(uploadErr?.message || "Feltöltés sikertelen");
      }

      // 2) Publikus URL
      const { data: { publicUrl } } = supabase
        .storage
        .from("videos")
        .getPublicUrl(filePath);

      // 3) Videó rekord beszúrása
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

      if (insertErr || !inserted?.id) {
        throw new Error(insertErr?.message || "Adatbázis mentés sikertelen");
      }

      // 4) Thumbnail generálás — itt jön a duplex opció!
      const thumbRes = await fetch("/api/generate-thumbnail", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        // duplex kell, hogy a Node.js fetch ne dobjon ENOENT-et
        duplex: "half" as const,
        body:    JSON.stringify({ videoPath: filePath, videoId: inserted.id }),
      });
      if (!thumbRes.ok) {
        const errJson = await thumbRes.json();
        console.error("🔴 Thumbnail API hiba:", errJson);
        throw new Error(errJson.error || "Thumbnail generálás sikertelen");
      }

      setProgress("done");
      router.push("/dashboard");

    } catch (err: unknown) {
      console.error("🚨 UploadPage catch:", err);
      const message = err instanceof Error ? err.message : "Ismeretlen hiba";
      setError(message);
      setProgress("idle");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <form onSubmit={handleUpload}
            className="bg-[#1c1c1c] p-8 rounded-2xl shadow w-full max-w-lg flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-white">Új videó feltöltése</h1>

        <FloatingInput
          label="Videó címe"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />

        <textarea
          rows={4}
          placeholder="Leírás"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="peer border border-gray-600 rounded-xl pt-6 pb-4 px-4 bg-[#2a2a2a] text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          required
        />

        <select
          value={category || ""}
          onChange={e => setCategory(e.target.value)}
          className="border border-gray-600 rounded-xl p-3 bg-[#2a2a2a] text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          required
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="text-white"
          required
        />

        {progress === "loading" && (
          <p className="text-gray-400">Feltöltés és feldolgozás...</p>
        )}
        {progress === "done" && (
          <p className="text-green-400">Sikeres feltöltés!</p>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={progress === "loading"}
          className="mt-4 bg-blue-500 hover:bg-blue-400 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
        >
          Feltöltés
        </button>
      </form>
    </div>
  );
}
