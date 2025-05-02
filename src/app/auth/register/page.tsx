"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FloatingInput } from "@/components/FloatingInput";

export default function RegisterPage() {
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [username, setUsername]       = useState("");
  const [errorMessage, setError]      = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const router                        = useRouter();

  // Ha már be vagyunk jelentkezve, irány a főoldal
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
      else setLoading(false);
    });
  }, [router]);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Alapvető validációk
    if (password !== confirmPassword) {
      setError("A jelszavak nem egyeznek.");
      return;
    }
    if (password.length < 6) {
      setError("A jelszónak legalább 6 karakteresnek kell lennie.");
      return;
    }
    if (!username.trim()) {
      setError("Adj meg egy felhasználónevet!");
      return;
    }

    // 1) Usernév foglaltság-ellenőrzés .maybeSingle()-rel
    const { data: existing, error: checkErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (checkErr) {
      setError("Hiba történt a felhasználónév ellenőrzésekor.");
      return;
    }
    if (existing) {
      setError("Ez a felhasználónév már foglalt.");
      return;
    }

    // 2) Auth regisztráció
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpErr || !signUpData.user) {
      setError(signUpErr?.message ?? "Regisztráció sikertelen.");
      return;
    }

    // 3) Profil tábla frissítése (username beállítása)
    try {
      const userId = signUpData.user.id;
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, username }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Profil mentése sikertelen.");
      }
    } catch (err: any) {
      setError(err.message);
      return;
    }

    // 4) Siker: irány a bejelentkezés
    router.push("/auth/login");
  };

  if (loading) return null; // vagy egy loader

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="bg-[#1f1f1f] p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-4xl font-bold text-[var(--foreground)] text-center mb-6">
          Regisztráció
        </h1>
        <form onSubmit={handleRegister} className="flex flex-col gap-6">
          <FloatingInput
            label="Felhasználónév"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <FloatingInput
            label="Email cím"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <FloatingInput
            label="Jelszó"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showTogglePassword
            required
          />
          <FloatingInput
            label="Jelszó újra"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirm(e.target.value)}
            showTogglePassword
            required
          />
          {errorMessage && (
            <p className="text-red-500 text-sm">{errorMessage}</p>
          )}
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-400 text-white font-semibold py-3 rounded-xl transition"
          >
            Regisztráció
          </button>
        </form>
        <div className="text-center text-sm text-gray-400 mt-6">
          Van már fiókod?{" "}
          <a
            href="/auth/login"
            className="text-blue-500 hover:text-blue-400 font-semibold"
          >
            Jelentkezz be!
          </a>
        </div>
      </div>
    </div>
  );
}
