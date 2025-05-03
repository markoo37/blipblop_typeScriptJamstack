// src/app/dashboard/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ProfileSection } from "@/components/ProfileSection";
import { MyVideosSection } from "@/components/MyVideosSection";

type Tab = "profile" | "videos";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramTab = searchParams.get("tab") as Tab | null;

  const [activeTab, setActiveTab] = useState<Tab>(paramTab ?? "profile");

  useEffect(() => {
    if (paramTab && paramTab !== activeTab) {
      setActiveTab(paramTab);
    }
  }, [paramTab, activeTab]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    router.replace(`/dashboard?tab=${tab}`, { scroll: false });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex">
      {/* Fixed sidebar under navbar */}
      <aside
        className="
          hidden md:flex
          fixed top-16 left-0
          h-[calc(100vh-4rem)] w-64
          bg-[#1c1c1c] p-6
          flex-col justify-between
          border-r border-[#2a2a2a] shadow-lg
        "
      >
        <div className="flex flex-col gap-4">
          <button
            onClick={() => handleTabChange("profile")}
            className={`
              text-left px-4 py-3 rounded-xl transition-all duration-300 font-medium
              ${activeTab === "profile"
                ? "bg-blue-500 text-white shadow-md"
                : "hover:bg-[#333] text-gray-300"}
            `}
          >
            Profil
          </button>

          <button
            onClick={() => handleTabChange("videos")}
            className={`
              text-left px-4 py-3 rounded-xl transition-all duration-300 font-medium
              ${activeTab === "videos"
                ? "bg-blue-500 text-white shadow-md"
                : "hover:bg-[#333] text-gray-300"}
            `}
          >
            Saját videóim
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="
            text-left px-4 py-3 rounded-xl transition-all duration-300 font-medium
            text-red-400 hover:text-red-700 hover:bg-[#333]
          "
        >
          Kijelentkezés
        </button>
      </aside>

      {/* Main content, offset by sidebar width and navbar height */}
      <main className="flex-1 p-10 md:ml-64 mt-16">
        {activeTab === "profile" && <ProfileSection />}
        {activeTab === "videos" && <MyVideosSection />}
      </main>
    </div>
  );
}
