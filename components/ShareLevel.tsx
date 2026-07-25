"use client";

import { useState } from "react";

export function ShareLevel({ levelId, canonicalUrl, compact = false }: { levelId: number; canonicalUrl: string; compact?: boolean }) {
  const [message, setMessage] = useState("");
  const title = `Color Block Jam Level ${levelId} Walkthrough`;
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setMessage(`Level ${levelId} link copied!`);
    } catch {
      setMessage("Copy failed. You can copy the page address from your browser.");
    }
  }
  async function share() {
    setMessage("");
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, text: title, url: canonicalUrl });
      // Share succeeded: do not copy
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // User cancelled: do nothing
        return;
      }
      // Other share errors: fallback to copy
      await copyLink();
    }
  }
  return (
    <div className={`share-level ${compact ? "compact" : ""}`}>
      <button type="button" className="share-button" onClick={share}><span aria-hidden="true">↗</span>Share Level {levelId}</button>
      {message ? <p className="share-toast" role="status" aria-live="polite">{message}</p> : null}
    </div>
  );
}