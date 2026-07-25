import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx next dev -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_ONLINE_GAME_ENABLED: "true",
      NEXT_PUBLIC_ONLINE_GAME_EMBED_URL: "/test-game.html",
      NEXT_PUBLIC_ONLINE_GAME_OPEN_URL: "/test-game.html",
      NEXT_PUBLIC_ONLINE_GAME_COVER_URL: "",
      NEXT_PUBLIC_ONLINE_GAME_ASPECT_RATIO: "4/3",
    },
  },
});