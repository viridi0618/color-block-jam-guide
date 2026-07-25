"use client";

import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { OnlineGamePlayer } from "./OnlineGamePlayer";
import { onlineGameAvailable } from "@/lib/online-game";

export function PersistentOnlineGame() {
  const pathname = usePathname();

  // Parse levelId from pathname for analytics only.
  // Never use this to change iframe src, key, or embed URL.
  const sourceLevel = useMemo(() => {
    const match = pathname?.match(/^\/level\/(\d+)/);
    return match ? Number(match[1]) : undefined;
  }, [pathname]);

  // Read sessionStorage once on mount to check if game was started this tab session.
  // Lazy initializer with SSR guard — sessionStorage is only available in the browser.
  const [gameStarted, setGameStarted] = useState(() => {
    if (typeof window === "undefined") return false;
    if (!onlineGameAvailable) return false;
    try {
      return sessionStorage.getItem("online_game_started") === "1";
    } catch {
      return false;
    }
  });

  const handleGameStart = useCallback(() => {
    try {
      sessionStorage.setItem("online_game_started", "1");
    } catch {
      // sessionStorage not available, ignore
    }
    setGameStarted(true);
  }, []);

  if (!onlineGameAvailable) return null;

  return (
    <section className="content-card online-game-level-section">
      <OnlineGamePlayer
        sourcePage="level"
        sourceLevel={sourceLevel}
        compact
        gameStarted={gameStarted}
        onGameStart={handleGameStart}
      />
    </section>
  );
}