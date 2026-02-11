import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
const THEME_STORAGE_KEY = "app_theme";

type ThemeProviderContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeProviderContext = createContext<
  ThemeProviderContextType | undefined
>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    try {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "dark" || savedTheme === "light") {
        return savedTheme;
      }
    } catch (error) {
      console.warn("Unable to read saved theme from localStorage", error);
    }

    return "dark";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;

    // Remove existing theme classes
    root.classList.remove("light", "dark");
    body.classList.remove("light", "dark");

    // Add current theme class
    root.classList.add(theme);
    body.classList.add(theme);

    // Set body styles based on theme
    if (theme === "dark") {
      body.style.backgroundColor = "#000000";
      body.style.color = "#f1f5f9";
    } else {
      body.style.backgroundColor = "#f8fafc";
      body.style.color = "#1e293b";
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn("Unable to persist theme to localStorage", error);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
