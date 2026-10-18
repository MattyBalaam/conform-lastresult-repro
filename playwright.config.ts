import { defineConfig, devices } from "@playwright/test";

const port = 4317;

export default defineConfig({
  testDir: "./tests",
  use: { baseURL: `http://localhost:${port}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec vite --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
  },
});
