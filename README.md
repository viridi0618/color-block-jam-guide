# Color Block Jam Guide

A mobile-first English walkthrough index that matches Color Block Jam level
numbers to public YouTube videos. The site publishes only approved level/video
pairs and does not generate unsupported written solutions.

## Commands

- `npm run ingest:youtube` — merge configured source imports into candidate and
  public level data.
- `npm run check:levels` — validate publishable level records and video IDs.
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Source policy

Source priority, quality status, and default aspect ratio are configured in
`data/sources/youtube-sources.json`. Raw playlist imports stay separated by
source, while candidate and review queues remain outside the frontend bundle.
See `SOURCE_NOTES.md` for attribution details.
