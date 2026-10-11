// User-authorized local Playwright recording. Credentials never enter a video.
import { chromium } from "../.demo-private/recorder-runtime/node_modules/playwright/index.mjs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const base = "http://127.0.0.1:3105";
const cohort = JSON.parse(
  await readFile(
    new URL("../.demo-private/cohort.json", import.meta.url),
    "utf8",
  ),
);
const output = resolve(
  "demo-video",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const sessions = {};
const ledger = [];
const viewport = { width: 1920, height: 1080 };
const shots = [
  ["01-home", null, "/"],
  ["02-industry-dashboard", "industry5", "/industry"],
  ["03-industry-candidates", "industry5", "/industry/candidates"],
  ["04-industry-recruitment", "industry5", "/industry/recruitment-tracker"],
  ["05-industry-programs", "industry5", "/industry/programs"],
  ["06-student-dashboard", "student5", "/student"],
  ["07-student-portfolio", "student5", "/student/portfolio"],
  ["08-student-programs", "student5", "/student/programs"],
  ["09-student-applications", "student5", "/student/applications"],
  ["10-student-internship", "student5", "/student/internships"],
  ["11-faculty-dashboard", "faculty1", "/academician"],
  ["12-faculty-supervision", "faculty1", "/academician/supervision"],
  ["13-institution-dashboard", "institution1", "/institution"],
  ["14-institution-students", "institution1", "/institution/students"],
  ["15-institution-placement", "institution1", "/institution/placement"],
];
async function login(key) {
  if (sessions[key]) return sessions[key];
  const account = cohort.accounts[key];
  if (!account || !account.email.startsWith("tp-demo-"))
    throw new Error("Only demo identities are allowed");
  const context = await browser.newContext({ viewport });
  try {
    const page = await context.newPage();
    await page.goto(base + "/login");
    await page.locator("#login-email").fill(account.email);
    await page.locator("#login-password").fill(account.password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.waitForURL(
      (url) => url.pathname.startsWith("/" + account.role),
      { timeout: 45000 },
    );
    sessions[key] = await context.storageState(); // Memory only. Never exported to footage.
    return sessions[key];
  } finally {
    await context.close();
  }
}
try {
  for (const [name, key, path] of shots.filter(
    (s) => !process.env.DEMO_SHOT || s[0] === process.env.DEMO_SHOT,
  )) {
    const storageState = key ? await login(key) : undefined;
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      colorScheme: "light",
      storageState,
      recordVideo: { dir: output, size: viewport },
    });
    const page = await context.newPage();
    try {
      await page.goto(base + path, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      if (new URL(page.url()).pathname.includes("login"))
        throw new Error("Session missing; rejecting clip");
      await page.locator("h1").first().waitFor({ timeout: 20000 });
      if (key)
        await page
          .getByLabel("Demonstration data notice")
          .waitFor({ timeout: 15000 });
      await page.waitForTimeout(2500);
      const text = await page.locator("body").innerText();
      if (
        /Application error:|Internal Server Error|Apply migration|workspace unavailable/i.test(
          text,
        )
      )
        throw new Error("Page reported a load error; rejecting clip");
      await page.mouse.move(1780, 950);
      await page.screenshot({ path: resolve(output, name + "-top.png") });
      await page.waitForTimeout(3500);
      await page.evaluate(() =>
        window.scrollBy({ top: 550, behavior: "smooth" }),
      );
      await page.waitForTimeout(3500);
      await page.screenshot({ path: resolve(output, name + "-detail.png") });
      await page.evaluate(() =>
        window.scrollBy({ top: 450, behavior: "smooth" }),
      );
      await page.waitForTimeout(3000);
      ledger.push({
        name,
        path,
        heading: await page.locator("h1").first().innerText(),
        status: "captured",
        video: resolve(output, name + ".webm"),
      });
      await context.close();
      await page.video().saveAs(resolve(output, name + ".webm"));
      await page.video().delete();
      console.log("Captured " + name);
    } catch (e) {
      if (!new URL(page.url()).pathname.includes("login"))
        await writeFile(
          resolve(output, name + "-diagnostic.txt"),
          await page
            .locator("main")
            .innerText()
            .catch(() => "Could not read workspace"),
        );
      await context.close();
      await page.video()?.delete();
      ledger.push({
        name,
        path,
        status: "failed",
        error: e.message.replace(/tp-demo-[^\s]+/g, "[demo identity]"),
      });
      console.log("Capture failed: " + name + " — " + e.message.split("\n")[0]);
    }
    await writeFile(
      resolve(output, "capture-manifest.json"),
      JSON.stringify(ledger, null, 2),
    );
  }
} finally {
  await browser.close();
}
console.log("Recordings: " + output);
if (ledger.some((s) => s.status === "failed")) process.exitCode = 1;
