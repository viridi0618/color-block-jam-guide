"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { onlineGameAvailable, onlineGameConfig } from "@/lib/online-game";

interface OnlineGamePlayerProps {
  sourcePage: "home" | "play_online" | "level";
  sourceLevel?: number;
  compact?: boolean;
  /** If true, the player was already started this session (sessionStorage). Skips idle state. */
  gameStarted?: boolean;
  /** Called when the user clicks Play Now for the first time. */
  onGameStart?: () => void;
}

type PlayerState = "idle" | "loading" | "playing" | "timeout";

export function OnlineGamePlayer({
  sourcePage,
  sourceLevel,
  compact = false,
  gameStarted = false,
  onGameStart,
}: OnlineGamePlayerProps) {
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const [reloadKey, setReloadKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoStarted = useRef(false);
  // Track per-load-cycle error dedup: only fire game_load_error once per reloadKey
  const errorTrackedForCycle = useRef(-1);

  // Auto-start if game was previously started in this tab session (sessionStorage recovery).
  // Only fires once, and only when gameStarted is true while playerState is still idle.
  useEffect(() => {
    if (gameStarted && !hasAutoStarted.current && playerState === "idle") {
      hasAutoStarted.current = true;
      setPlayerState("loading");
    }
  }, [gameStarted, playerState]);

  const handlePlay = useCallback(() => {
    setPlayerState("loading");
    track("game_start", {
      game_provider: onlineGameConfig.provider,
      source_page: sourcePage,
      ...(sourceLevel != null ? { source_level: sourceLevel } : {}),
    });
    // Fire source-specific event once on first click
    if (sourcePage === "home") {
      track("play_online_from_home", {
        source_page: "home",
      });
    }
    if (sourcePage === "level") {
      track("play_online_from_level", {
        source_page: "level",
        ...(sourceLevel != null ? { source_level: sourceLevel } : {}),
      });
    }
    onGameStart?.();
  }, [sourcePage, sourceLevel, onGameStart]);

  const handleIframeLoad = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPlayerState("playing");
  }, []);

  const handleTryAgain = useCallback(() => {
    setPlayerState("loading");
    setReloadKey((k) => k + 1);
    track("game_retry", {
      source_page: sourcePage,
      ...(sourceLevel != null ? { source_level: sourceLevel } : {}),
    });
  }, [sourcePage, sourceLevel]);

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

  // Fire game_load_error exactly once per load cycle when timeout is reached
  useEffect(() => {
    if (playerState !== "timeout") return;
    if (errorTrackedForCycle.current === reloadKey) return; // already fired for this cycle
    errorTrackedForCycle.current = reloadKey;
    track("game_load_error", {
      game_provider: onlineGameConfig.provider,
      source_page: sourcePage,
      ...(sourceLevel != null ? { source_level: sourceLevel } : {}),
      error_type: "timeout",
    });
  }, [playerState, reloadKey, sourcePage, sourceLevel]);

  if (!onlineGameAvailable) return null;

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

            <div className="online-game-start-overlay">
              <button
                className="primary-button online-game-play-btn"
                type="button"
                onClick={handlePlay}
              >
                <span className="online-game-play-icon" aria-hidden="true">
                  ▶
                </span>
                <span>Play Now</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="online-game-active">
          <div
            className="online-game-frame"
            style={{ aspectRatio }}
          >
            <iframe
              key={reloadKey}
              src={onlineGameConfig.embedUrl}
              title="Color Block Jam Online"
              allow="autoplay; fullscreen; gamepad"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={handleIframeLoad}
              className="online-game-iframe"
            />

            {playerState === "timeout" && (
              <div className="online-game-timeout-overlay">
                <div className="online-game-timeout-panel">
                  <p className="online-game-timeout-msg">
                    The game is taking longer than expected to load.
                  </p>
                  <button
                    className="online-game-retry-btn"
                    type="button"
                    onClick={handleTryAgain}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}