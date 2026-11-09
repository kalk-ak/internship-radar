"use client";

import { MoonIcon, SunIcon } from "@primer/octicons-react";
import { useEffect, useState } from "react";

const KEY = "ir-dev-theme";
type Theme = "dark" | "light";

function root() {
  return document.querySelector<HTMLElement>(".gh-root");
}

/** Runs before first paint (inlined in the page) so a saved light theme never flashes dark. */
export const themeBootScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.currentScript.parentElement.dataset.theme=t}catch(e){}`;

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    const initial: Theme = saved === "light" ? "light" : "dark";
    root()?.setAttribute("data-theme", initial);
    // Syncing React state with what the boot script already applied to the DOM.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    root()?.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gh-border bg-gh-btn text-gh-muted hover:bg-gh-btn-hover hover:text-gh-fg"
    >
      {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
    </button>
  );
}
