"use client";

import { useState } from "react";

interface FloatingInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  showTogglePassword?: boolean;
}

export function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
  required,
  showTogglePassword = false,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isActive = isFocused || value.length > 0;
  const inputType = showTogglePassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="relative w-full">
      <input
        type={inputType}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required={required}
        className="peer border border-gray-700 bg-[#1f1f1f] rounded-xl pt-6 pb-4 px-4 w-full text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder={label}
      />
      <label
        className={`absolute left-4 text-gray-400 transition-all pointer-events-none
          ${isActive ? "text-xs top-1" : "text-base top-1/2 -translate-y-1/2"}
        `}
      >
        {label}
      </label>

      {showTogglePassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showPassword ? "Elrejt" : "Mutat"}
        </button>
      )}
    </div>
  );
}
