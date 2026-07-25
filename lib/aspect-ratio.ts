export type AspectRatio = "16:9" | "9:16" | "4:3";

export const VALID_ASPECT_RATIOS = new Set<string>(["16:9", "9:16", "4:3"]);

export interface AspectRatioConflict {
  type: string;
  severity: string;
  videoId: string;
  reason: string;
}

/**
 * Validate a record of aspect ratio overrides.
 * Returns conflicts for any invalid ratio values.
 */
export function validateAspectRatioOverrides(
  overrides: Record<string, unknown>,
): AspectRatioConflict[] {
  const conflicts: AspectRatioConflict[] = [];
  for (const [videoId, ratio] of Object.entries(overrides)) {
    if (typeof ratio !== "string" || !VALID_ASPECT_RATIOS.has(ratio)) {
      conflicts.push({
        type: "invalid_aspect_ratio_override",
        severity: "error",
        videoId,
        reason: `Invalid aspect ratio "${String(ratio)}" for video ${videoId}. Must be one of: 16:9, 9:16, 4:3`,
      });
    }
  }
  return conflicts;
}

/**
 * Resolve the final aspect ratio for a video.
 * Override takes priority, otherwise falls back to the source default.
 */
export function resolveAspectRatio(
  videoId: string,
  sourceDefault: AspectRatio,
  overrides: Record<string, AspectRatio>,
): AspectRatio {
  return overrides[videoId] ?? sourceDefault;
}