"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { onlineGameConfig } from "@/lib/online-game";

interface OnlineGamePlayerProps {
  sourcePage: "play_online" | "level";
  sourceLevel?: number;
  compact?: boolean;
}

type PlayerState = "idle" | "loading" | "playing" | "timeout";

export function OnlineGamePlayer({
  sourcePage,
  sourceLevel,
  compact = false,
}: OnlineGamePlayerProps) {
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePlay = useCallback(() => {
    setPlayerState("loading");
    track("game_start", {
      game_provider: onlineGameConfig.provider,
      source_page: sourcePage,
      ...(sourceLevel != null ? { source_level: sourceLevel } : {}),
    });
  }, [sourcePage, sourceLevel]);

  const handleIframeLoad = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPlayerState("playing");
  }, []);

  const handleReload = useCallback(() => {
    setPlayerState("loading");
    setReloadKey((k) => k + 1);
    track("game_reload", { source_page: sourcePage });
  }, [sourcePage]);

  const handleFullscreen = useCallback(() => {
    const el = iframeRef.current;
    if (el?.requestFullscreen) {
      try {
        el.requestFullscreen();
      } catch {
        // fullscreen not supported, silently ignore
      }
    }
    track("game_fullscreen", { source_page: sourcePage });
  }, [sourcePage]);

  const handleOpenExternal = useCallback(() => {
    track("game_open_external", { source_page: sourcePage });
  }, [sourcePage]);

  // Loading timeout: after 12 seconds, show fallback
  useEffect(() => {
    if (playerState !== "loading") return;
    timeoutRef.current = setTimeout(() => {
      setPlayerState("timeout");
    }, 12000);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [playerState, reloadKey]);

  if (!onlineGameConfig.enabled) return null;

  const aspectRatio = onlineGameConfig.aspectRatio;
  const containerClass = compact
    ? "online-game-shell online-game-shell--compact"
    : "online-game-shell";

  return (
    <div className={containerClass}>
      {!compact && (
        <>
          <h2>Play Color Block Jam Online</h2>
          <p className="online-game-intro">
            Start a quick browser puzzle game.
          </p>
        </>
      )}

      {playerState === "idle" ? (
        <div className="online-game-cover">
          <div
            className="online-game-frame"
            style={{ aspectRatio }}
          >
            {onlineGameConfig.coverUrl ? (
              <img
                src={onlineGameConfig.coverUrl}
                alt="Color Block Jam game cover"
                className="online-game-cover-img"
              />
            ) : (
              <div className="online-game-cover-placeholder">
                <span aria-hidden="true">🎮</span>
                <span>Color Block Jam</span>
              </div>
            )}
          </div>
          <button
            className="primary-button online-game-play-btn"
            type="button"
            onClick={handlePlay}
          >
            Play Now
          </button>
        </div>
      ) : (
        <div className="online-game-active">
          <div
            className="online-game-frame"
            style={{ aspectRatio }}
          >
            <iframe
              ref={iframeRef}
              key={reloadKey}
              src={onlineGameConfig.embedUrl}
              title="Color Block Jam Online"
              allow="autoplay; fullscreen; gamepad"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={handleIframeLoad}
              className="online-game-iframe"
            />
          </div>

          <div className="online-game-controls">
            <button
              className="online-game-ctrl-btn"
              type="button"
              onClick={handleReload}
            >
              Reload Game
            </button>
            <button
              className="online-game-ctrl-btn"
              type="button"
              onClick={handleFullscreen}
            >
              Fullscreen
            </button>
            <a
              className="online-game-ctrl-btn"
              href={onlineGameConfig.openUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenExternal}
            >
              Open Game in New Tab
            </a>
          </div>

          {playerState === "timeout" && (
            <p className="online-game-timeout-msg">
              Having trouble loading the game? Reload it or open it in a new
              tab.
            </p>
          )}
        </div>
      )}
    </div>
  );
}