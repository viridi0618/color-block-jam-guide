"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";

export function TrackedPlayOnlineLink() {
  return (
    <Link
      href="/play-online"
      className="primary-button"
      onClick={() => {
        track("play_online_from_home", {
          source_page: "home",
        });
      }}
    >
      Play Online
    </Link>
  );
}