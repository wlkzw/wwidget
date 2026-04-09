import { useEffect, useState } from "react";
import type { Theme } from "@shared/types";

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    window.electronAPI.theme.get().then(setTheme);
    const unsub = window.electronAPI.theme.onChanged(setTheme);
    return unsub;
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return <>{children}</>;
}
