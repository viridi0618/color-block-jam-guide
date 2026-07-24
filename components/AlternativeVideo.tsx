"use client";

import Image from "next/image";
import { useState } from "react";
import type { WalkthroughVideo } from "@/lib/types";
import { VideoEmbed } from "./VideoEmbed";

export function AlternativeVideo({ video }: { video: WalkthroughVideo }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="alternative">
      {loaded ? <VideoEmbed video={video} /> : (
        <button type="button" className="alternative-preview" onClick={() => setLoaded(true)}>
          <Image src={video.thumbnailUrl} alt="" width={480} height={270} sizes="(max-width: 600px) 100vw, 480px" />
          <span>Watch alternative from {video.channelTitle}</span>
        </button>
      )}
    </div>
  );
}
