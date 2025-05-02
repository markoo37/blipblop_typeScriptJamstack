"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ProfileSection } from "@/components/ProfileSection";
import { MyVideosSection } from "@/components/MyVideosSection";
import Link from "next/link";

type Tab = "profile" | "videos" | "upload";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramTab = searchParams.get("tab") as Tab | null;

  // Ha nincs paraméter, default "profile"
  const [activeTab, setActiveTab] = useState<Tab>(paramTab ?? "profile");

  // Ha a query paraméter manuálisan változik (pl. linkből), szinkronizálunk
  useEffect(() => {
    if (paramTab && paramTab !== activeTab) {
      setActiveTab(paramTab);
    }
  }, [paramTab]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    // URL frissítése shallow routinggal, így nem full page reload
    router.replace(`/dashboard?tab=${tab}`, { scroll: false });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex bg-[var(--background)] text-[var(--foreground)]">
      {/* Sidebar – csak md+ */}
      <aside className="hidden md:flex md:w-64 bg-[#1c1c1c] p-6 flex-col gap-6 border-r border-[#2a2a2a] shadow-lg">
        <button
          onClick={() => handleTabChange("profile")}
          className={`text-left px-4 py-3 rounded-xl transition-all duration-300 ease-in-out font-medium ${
            activeTab === "profile"
              ? "bg-blue-500 text-white shadow-md"
              : "hover:bg-[#333] text-gray-300"
          }`}
        >
          Profil
        </button>

        <button
          onClick={() => handleTabChange("videos")}
          className={`text-left px-4 py-3 rounded-xl transition-all duration-300 ease-in-out font-medium ${
            activeTab === "videos"
              ? "bg-blue-500 text-white shadow-md"
              : "hover:bg-[#333] text-gray-300"
          }`}
        >
          Saját videóim
        </button>

        <div className="flex-grow" />

        <button
          onClick={handleLogout}
          className="text-left px-4 py-3 rounded-xl transition-all duration-300 ease-in-out font-medium text-red-400 hover:text-red-700 hover:bg-[#333]"
        >
          Kijelentkezés
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-10 md:ml-64 transition-all">
        {activeTab === "profile" && <ProfileSection />}
        {activeTab === "videos" && <MyVideosSection />}
      </main>
    </div>
  );
}
