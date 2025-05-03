// src/app/page.tsx (HomePage)
"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronDown, Check } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";

interface Category {
  id: string;
  name: string;
}

interface Video {
  id: string;
  title: string;
  created_at: string;
  views: number;
  category_id: string;
  thumbnail_url?: string;  // optional
}

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(true);

  // 1) Kategóriák betöltése
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) console.error("Kategóriák lekérése hiba:", error.message);
      else setCategories([{ id: "all", name: "Összes" }, ...data]);
      setLoadingCats(false);
    })();
  }, []);

  // 2) Videók betöltése, thumbnail_url-lal
  useEffect(() => {
    (async () => {
      setLoadingVideos(true);
      let query = supabase
        .from<Video>("videos")
        .select("id, title, created_at, views, category_id, thumbnail_url")
        .order("created_at", { ascending: false });
      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      if (searchTerm.trim()){
        query = query.ilike("title", `%${searchTerm.trim()}%`)
      }

      const { data, error } = await query;
      if (error) console.error("Videók lekérése hiba:", error.message);
      else setVideos(data);
      setLoadingVideos(false);
    })();
  }, [selectedCategory, searchTerm]);

  return (
    <main className="min-h-screen bg-[var(--background)] p-6">
      <h1 className="text-4xl font-bold text-[var(--foreground)] mb-6">Videók</h1>

      {/*Kereső komponens */}
      <SearchBar value={searchTerm} onChange={setSearchTerm}/>
      {/* Kategória szűrő */}
      <div className="mb-6">
        {loadingCats ? (
          <div className="h-10 w-40 bg-gray-700 rounded animate-pulse" />
        ) : (
          <Listbox
            as="div"
            value={selectedCategory}
            onChange={setSelectedCategory}
            className="relative w-40"
          >
            <Listbox.Button className="w-full bg-[#2a2a2a] border border-gray-600 rounded-xl p-2 flex justify-between items-center text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition">
              <span>{categories.find(c => c.id === selectedCategory)?.name}</span>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </Listbox.Button>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute mt-1 w-full bg-[#2a2a2a] shadow-lg max-h-60 rounded-xl py-1 overflow-auto ring-1 ring-black ring-opacity-5 text-base">
                {categories.map(cat => (
                  <Listbox.Option
                    key={cat.id}
                    value={cat.id}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        active ? "bg-blue-500 text-white" : "text-gray-300"
                      }`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span className={`${selected ? "font-semibold" : "font-normal"} block`}>
                          {cat.name}
                        </span>
                        {selected && (
                          <Check className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </Listbox>
        )}
      </div>

      {/* Videók rács */}
      {loadingVideos ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="animate-pulse bg-[#2a2a2a] rounded-lg h-48" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map(video => (
            <Link
              key={video.id}
              href={`/videos/${video.id}`}
              className="block bg-[#1f1f1f] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition"
            >
              {/* Thumbnail vagy placeholder */}
              {video.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="bg-gray-700 h-40 w-full" />
              )}

              <div className="p-4">
                <h2 className="text-lg font-semibold text-white mb-2">{video.title}</h2>
                <p className="text-sm text-gray-400">
                  Feltöltve: {new Date(video.created_at).toLocaleDateString("hu-HU")}
                </p>
                <p className="text-sm text-gray-400 mt-1">Megtekintés: {video.views}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}