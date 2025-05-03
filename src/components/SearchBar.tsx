// src/components/SearchBar.tsx
"use client";

import { ChangeEvent, FC } from "react";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
}

export const SearchBar: FC<SearchBarProps> = ({ value, onChange }) => (
  <div className="relative w-full max-w-md mb-6">
    <input
      type="text"
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder="Keresés cím alapján…"
      className="w-full p-3 pl-10 rounded-xl bg-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
    />
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
      🔍
    </span>
  </div>
);
