// src/components/ProfileSection.tsx
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserCircle, Edit2, Save, X, Trash2 } from "lucide-react";
import Image from "next/image";

export function ProfileSection() {
  const [user, setUser] = useState<{
    id: string;
    username: string;
    email: string;
    avatar_url: string | null;
    created_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarDeleted, setAvatarDeleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }
    const userId = session.user.id;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, email, avatar_url, created_at")
      .eq("id", userId)
      .single();
    if (!error && profile) {
      setUser(profile);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
    setAvatarDeleted(false);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleAvatarDelete = () => {
    setAvatarDeleted(true);
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);

    const updates: Partial<{ username: string; avatar_url: string | null }> = {
      username,
    };

    // 1) Új avatar feltöltése
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const filePath = `avatars/${user.id}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase
        .storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });
      if (uploadErr) {
        setError("Avatar feltöltés sikertelen: " + uploadErr.message);
        setSaving(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);
      updates.avatar_url = `${publicUrl}?t=${Date.now()}`; // cache bust
    }
    // 2) Avatar törlése a Storage-ból és DB-ből
    else if (avatarDeleted) {
      updates.avatar_url = null;

      const { data: files, error: listErr } = await supabase
        .storage
        .from("avatars")
        .list("", { limit: 100 });
      if (!listErr && files) {
        const toDelete = files
          .filter((f) => f.name.startsWith(`${user.id}-`))
          .map((f) => f.name);
        if (toDelete.length > 0) {
          const { error: removeErr } = await supabase
            .storage
            .from("avatars")
            .remove(toDelete);
          if (removeErr) console.error("Avatar törlés hiba:", removeErr);
        }
      }
    }

    // 3) Profil DB frissítése
    const { error: updateErr } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    if (updateErr) {
      setError("Frissítés sikertelen: " + updateErr.message);
      setSaving(false);
      return;
    }

    // 4) Újra betöltjük a profiladatokat
    await fetchProfile();
    setEditMode(false);
    setAvatarDeleted(false);
    setAvatarFile(null);
    setPreviewUrl(null);

    // Esemény a Navbar frissítéséhez
    window.dispatchEvent(new Event("profile-updated"));

    setSaving(false);
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-6">Profilom</h1>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-[#2a2a2a] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (!user) return <p>Nem találtam a profilodat.</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Profilom</h1>
        {!editMode ? (
          <button
            onClick={() => {
              setUsername(user.username);
              setEditMode(true);
            }}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-600 transition"
          >
            <Edit2 size={20} /> Szerkesztés
          </button>
        ) : (
          <button
            onClick={() => {
              setEditMode(false);
              setAvatarDeleted(false);
              setAvatarFile(null);
              setPreviewUrl(null);
            }}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-200 transition"
          >
            <X size={20} /> Mégse
          </button>
        )}
      </div>

      {!editMode ? (
        <div className="bg-[#2a2a2a] p-6 rounded-xl shadow-md animate-fadeInUp">
          <div className="flex items-center gap-6 mb-4">
            <div className="w-32 h-32 rounded-full overflow-hidden relative">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <UserCircle className="w-32 h-32 text-gray-500" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-300">Felhasználónév</h2>
              <p className="text-white">{user.username}</p>
            </div>
          </div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-300">Email cím</h2>
            <p className="text-white">{user.email}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-300">Csatlakozás dátuma</h2>
            <p className="text-white">
              {new Date(user.created_at).toLocaleDateString("hu-HU", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-[#2a2a2a] p-6 rounded-xl shadow-md space-y-4">
          {error && <p className="text-red-400">{error}</p>}

          <div className="flex items-center gap-6">
            <label className="cursor-pointer">
              <div className="w-32 h-32 rounded-full overflow-hidden relative">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Avatar Preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : user.avatar_url && !avatarDeleted ? (
                  <Image
                    src={user.avatar_url}
                    alt="Avatar"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <UserCircle className="w-32 h-32 text-gray-500" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="sr-only"
              />
            </label>
            <div className="flex flex-col space-y-1">
              <p className="text-gray-400 text-sm">
                Kattints az avatarra új kép feltöltéséhez
              </p>
              {user.avatar_url && !previewUrl && (
                <button
                  type="button"
                  onClick={handleAvatarDelete}
                  className="flex items-center gap-1 text-red-400 hover:text-red-600 text-sm"
                >
                  <Trash2 size={16} /> Törlés
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Felhasználónév</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1f1f1f] p-2 rounded border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition disabled:opacity-50"
          >
            <Save size={18} /> Mentés
          </button>
        </form>
      )}
    </div>
  );
}
