import type { WalkthroughVideo } from "@/lib/types";

const ratioClass = {
  "16:9": "",
  "9:16": "ratio-portrait",
  "4:3": "ratio-classic",
};

export function VideoEmbed({ video }: { video: WalkthroughVideo }) {
  const isPortrait = video.aspectRatio === "9:16";

  return (
    <div className={isPortrait ? "video-card video-card--portrait" : "video-card"}>
      <div className={`video-frame ${ratioClass[video.aspectRatio]}`}>
        <iframe
          src={`https://www.youtube.com/embed/${video.videoId}?rel=0&playsinline=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}