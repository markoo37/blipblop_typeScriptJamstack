// src/hooks/useIdleLogout.ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 perc

export function useIdleLogout() {
  const router = useRouter();
  const timeoutId = useRef<ReturnType<typeof setTimeout>>(null);

  const resetTimer = useCallback(() => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
    timeoutId.current = setTimeout(async () => {
      await supabase.auth.signOut();
      router.replace("/auth/login");
    }, IDLE_TIMEOUT);
  }, [router]);

  useEffect(() => {
    // Eventek, amik "aktivitásnak" számítanak
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

    // Minden eventnél reseteljük az időzítőt
    events.forEach((evt) =>
      window.addEventListener(evt, resetTimer, { passive: true })
    );

    // Induláskor is indítsuk el
    resetTimer();

    return () => {
      // cleanup
      if (timeoutId.current) clearTimeout(timeoutId.current);
      events.forEach((evt) =>
        window.removeEventListener(evt, resetTimer)
      );
    };
  }, [resetTimer]);
}
