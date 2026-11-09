"use client";
import { useEffect, useState } from "react";

export default function GlobalLoading() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const originalFetch = window.fetch.bind(window);
    let pending = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const show = () => {
      if (active) return;
      if (timer) return;
      timer = setTimeout(() => setActive(true), 80);
    };
    const hideIfIdle = () => {
      if (pending <= 0) {
        pending = 0;
        if (timer) { clearTimeout(timer); timer = null; }
        setActive(false);
      }
    };

    const shouldSkip = (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        if (headers.get("x-global-loading") === "skip") return true;
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
        // Éviter le flicker sur le polling des notifications
        if (method === "GET" && url.includes("/api/notifications")) return true;
      } catch {}
      return false;
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (shouldSkip(input, init)) return originalFetch(input, init);
      pending += 1;
      show();
      try {
        return await originalFetch(input, init);
      } finally {
        pending -= 1;
        hideIfIdle();
      }
    };

    return () => {
      window.fetch = originalFetch;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!active) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none" aria-hidden="true" aria-live="polite" aria-busy="true">
      <div className="h-1.5 bg-blue-200/70 overflow-hidden">
        <div className="h-full w-1/3 bg-blue-600 animate-[global-loading_1s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
