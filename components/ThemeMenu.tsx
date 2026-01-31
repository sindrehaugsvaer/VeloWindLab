"use client";

import { useTheme } from "@/context/ThemeContext";
import { useState, useRef, useEffect } from "react";

export default function ThemeMenu({ compact = false }: { compact?: boolean }) {
  const { themeMode, setThemeMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const options = [
    {
      mode: "light" as const,
      label: "Light",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      mode: "dark" as const,
      label: "Dark",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ),
    },
    {
      mode: "system" as const,
      label: "System",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  const currentOption = options.find((opt) => opt.mode === themeMode) || options[2];

  if (compact) {
    const toggleMode = () => {
      const next =
        themeMode === "light" ? "dark" : themeMode === "dark" ? "system" : "light";
      setThemeMode(next);
    };

    return (
      <button
        onClick={toggleMode}
        className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer h-10 w-10 flex items-center justify-center"
        aria-label={`Theme: ${currentOption.label}`}
        title={`Theme: ${currentOption.label}`}
      >
        {currentOption.icon}
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer h-10 w-10 flex items-center justify-center"
        aria-label="Theme settings"
        title={`Theme: ${currentOption.label}`}
      >
        {currentOption.icon}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 rounded-lg bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-zinc-700 overflow-hidden z-50">
          {options.map((option) => (
            <button
              key={option.mode}
              onClick={() => {
                setThemeMode(option.mode);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                ${
                  themeMode === option.mode
                    ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                }
              `}
            >
              {option.icon}
              <span>{option.label}</span>
              {themeMode === option.mode && (
                <svg
                  className="h-4 w-4 ml-auto"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
