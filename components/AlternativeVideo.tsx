"use client";

import { useState } from "react";
import type { WalkthroughVideo } from "@/lib/types";
import { VideoEmbed } from "./VideoEmbed";

export function AlternativeVideo({ video }: { video: WalkthroughVideo }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <details className="alternative">
      <summary>Alternative walkthrough from {video.channelTitle}</summary>
      {loaded ? (
        <VideoEmbed video={video} />
      ) : (
        <button
          type="button"
          className="load-video"
          onClick={() => setLoaded(true)}
        >
          Load alternative video
        </button>
      )}
    </details>
  );
}
