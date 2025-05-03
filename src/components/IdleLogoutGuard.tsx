// src/components/IdleLogoutGuard.tsx
"use client";

import { ReactNode } from "react";
import { useIdleLogout } from "@/hooks/useIdleLogout";

export function IdleLogoutGuard({ children }: { children: ReactNode }) {
  useIdleLogout();
  return <>{children}</>;
}