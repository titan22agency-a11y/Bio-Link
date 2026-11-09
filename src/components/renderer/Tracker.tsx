"use client";

import { useEffect } from "react";

/**
 * Client-side analytics. Pages are statically cached, so views must be
 * recorded from the browser. Clicks are captured on any element with
 * data-track="<blockId>" and sent with sendBeacon so navigation is not delayed.
 */
export function Tracker({ pageId }: { pageId: string }) {
  useEffect(() => {
    const send = (body: object) => {
      const payload = JSON.stringify({ pageId, referrer: document.referrer || null, ...body });
      if (!navigator.sendBeacon?.("/api/track", new Blob([payload], { type: "application/json" }))) {
        fetch("/api/track", { method: "POST", body: payload, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
      }
    };

    // One view per tab session per page.
    const key = `lv:${pageId}`;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        send({ type: "VIEW" });
      }
    } catch {
      send({ type: "VIEW" });
    }

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]");
      if (!el) return;
      send({ type: "CLICK", blockId: el.dataset.track, target: el.getAttribute("href") });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pageId]);

  return null;
}
