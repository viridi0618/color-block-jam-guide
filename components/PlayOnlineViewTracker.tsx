"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

export function PlayOnlineViewTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    track("play_online_view", {
      source_page: "play_online",
    });
  }, []);

  return null;
}