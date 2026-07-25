import type { WalkthroughVideo } from "@/lib/types";

const ratioClass = {
  "16:9": "",
  "9:16": "ratio-portrait",
  "4:3": "ratio-classic",
};

export function VideoEmbed({ video }: { video: WalkthroughVideo }) {
  return (
    <div className="video-card">
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
      <div className="video-caption">
        <span>
          Video by <strong>{video.channelTitle}</strong>
        </span>
        {video.durationSeconds ? (
          <span>{Math.floor(video.durationSeconds / 60)} min walkthrough</span>
        ) : null}
      </div>
      <p className="video-backup-link">
        Video not loading?{" "}
        <a
          href={`https://www.youtube.com/watch?v=${video.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Watch on YouTube
        </a>
      </p>
    </div>
  );
}