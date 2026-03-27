import { PropsWithChildren, createContext, useContext, useEffect, useMemo } from "react";
import { useLocalStorageState } from "../hooks/useLocalStorageState";

type AppTheme = "light" | "dark";

interface ThemeContextValue {
  theme: AppTheme;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = "theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): AppTheme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useLocalStorageState<AppTheme>(
    THEME_STORAGE_KEY,
    getInitialTheme(),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () =>
        setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light")),
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
