"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FloatingInput } from "@/components/FloatingInput";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // ÚJ!
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/"); // ha be van jelentkezve, irány a főoldal
      } else {
        setLoading(false); // ha nincs session, akkor mutassuk az oldalt
      }
    };

    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", username)
      .single();

    if (profileError || !profile) {
      setErrorMessage("Hibás felhasználónév vagy jelszó.");
      return;
    }

    const email = profile.email;

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setErrorMessage("Hibás felhasználónév vagy jelszó.");
    } else {
      router.push("/");
    }
  };

  if (loading) {
    return null; // Vagy ide lehet loader animációt tenni
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="bg-[#1f1f1f] p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-4xl font-bold text-[var(--foreground)] text-center mb-6">Bejelentkezés</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <FloatingInput
            label="Felhasználónév"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <FloatingInput
            label="Jelszó"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showTogglePassword
          />

          {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}

          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-200 text-white hover:text-black p-3 rounded-xl font-semibold transition-all duration-500 ease-in-out"
          >
            Bejelentkezés
          </button>
        </form>

        <div className="text-center text-sm text-gray-400 mt-6">
          Nincs még fiókod?{" "}
          <a href="/auth/register" className="text-blue-500 hover:text-blue-400 font-semibold transition-colors">
            Regisztrálj!
          </a>
        </div>
      </div>
    </div>
  );
}
