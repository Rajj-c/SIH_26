import { chromium } from "../.demo-private/recorder-runtime/node_modules/playwright/index.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const directory = resolve(process.argv[2] || "");
if (!directory.includes("/demo-video/"))
  throw new Error("Pass the demo-video recording directory");
const ledger = JSON.parse(
  await readFile(resolve(directory, "capture-manifest.json"), "utf8"),
);
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const page = await browser.newPage();
  for (const item of ledger) {
    if (item.status !== "captured") continue;
    await page.goto(pathToFileURL(item.video).href);
    await page.waitForFunction(() => {
      const v = document.querySelector("video");
      return v && v.readyState >= 2 && Number.isFinite(v.duration);
    });
    const result = await page.locator("video").evaluate(async (video) => {
      const start = video.currentTime;
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 600));
      video.pause();
      return {
        seconds: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        playbackAdvanced: video.currentTime > start,
        error: video.error?.message || null,
      };
    });
    if (
      result.error ||
      !result.playbackAdvanced ||
      result.width !== 1920 ||
      result.height !== 1080
    )
      throw new Error("Playback validation failed for " + item.name);
    results.push({ name: item.name, ...result });
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(directory, "playback-verification.json"),
  JSON.stringify(results, null, 2),
);
console.log(
  JSON.stringify(
    {
      clips: results.length,
      rawSeconds: results.reduce((sum, r) => sum + r.seconds, 0),
      resolution: "1920x1080",
      allPlayed: results.every((r) => r.playbackAdvanced),
    },
    null,
    2,
  ),
);
