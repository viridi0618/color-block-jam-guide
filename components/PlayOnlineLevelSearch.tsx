"use client";

import { LevelSearch } from "./LevelSearch";
import { track } from "@/lib/analytics";

export function PlayOnlineLevelSearch({
  approvedLevels,
}: {
  approvedLevels: number[];
}) {
  return (
    <LevelSearch
      approvedLevels={approvedLevels}
      buttonLabel="Find My Walkthrough"
      onValidSubmit={(levelId) => {
        track("walkthrough_search_from_play_page", {
          source_page: "play_online",
          target_level: levelId,
        });
      }}
    />
  );
}