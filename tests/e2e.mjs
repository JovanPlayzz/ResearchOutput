// End-to-end checks in a real browser (Microsoft Edge) against a running server.
//
//   DATABASE_FILE=C:/tmp/test.db npm run dev -- --port 3001
//   BASE=http://localhost:3001 DB_FILE=C:/tmp/test.db node tests/e2e.mjs
//
// The server must be using the demo data (a fresh DATABASE_FILE seeds itself).
import { chromium, devices } from "playwright-core";
import { createClient } from "@libsql/client";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:3001";
const DB_FILE = process.env.DB_FILE;
if (!DB_FILE) {
  console.error("Set DB_FILE to the SQLite file the server is using.");
  process.exit(2);
}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const dbc = createClient({ url: "file:" + DB_FILE.replace(/\\/g, "/") });
const q = async (sql, args = []) => (await dbc.execute({ sql, args })).rows;

const results = [];
const ok = (name, cond, extra = "") => {
  results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? " " + extra : ""}`);
  if (!cond) console.log("FAIL", name, extra);
};

async function login(page, email, password = "password123") {
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/(dashboard|onboarding|change-password)/, { timeout: 60000 });
}

const browser = await chromium.launch({ channel: "msedge" });
const errors = [];
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1600 }, ...opts });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page };
}

const cleanupFiles = [];
// Leftovers from an earlier run against the same database.
await q("delete from submissions where assignment_id in (select id from assignments where title = 'E2E Quiz')");
await q("delete from assignments where title = 'E2E Quiz'");
await q("delete from announcement_reads where announcement_id in (select id from announcements where title = 'E2E Notice')");
await q("delete from announcements where title = 'E2E Notice'");
try {
  /* ---------- student pages ---------- */
  {
    const { ctx, page } = await newPage();
    await login(page, "maya@lakeside.edu");
    for (const p of ["/dashboard", "/announcements", "/calendar", "/schedule", "/classes", "/grades", "/todo", "/settings"]) {
      const res = await page.goto(BASE + p, { waitUntil: "networkidle" });
      ok(`student ${p} loads`, res && res.status() === 200, String(res && res.status()));
    }
    await ctx.close();
  }

  /* ---------- teacher posts work, student turns in a file, teacher grades ---------- */
  const [calc] = await q(
    "select c.id from classrooms c join sections s on s.id = c.section_id join users u on u.id = c.teacher_id where c.name = 'Basic Calculus' and s.name = 'CORE' and u.email = 'cruz@lakeside.edu' and c.semester = 1",
  );
  ok("demo class found", Boolean(calc));
  let assignmentId = null;
  {
    const { ctx, page } = await newPage();
    await login(page, "cruz@lakeside.edu");
    await page.goto(`${BASE}/classes/${calc.id}?tab=work`, { waitUntil: "networkidle" });
    await page.click('button:has-text("New work")');
    await page.fill('input[name="title"]', "E2E Quiz");
    await page.fill('input[name="points"]', "10");
    await page.click('button:has-text("Post work")');
    await page.waitForSelector("text=E2E Quiz", { timeout: 30000 });
    const [row] = await q("select id, quarter from assignments where title = 'E2E Quiz'");
    assignmentId = row && row.id;
    ok("teacher posted classwork", Boolean(assignmentId), row ? `quarter ${row.quarter}` : "");
    await ctx.close();
  }
  let submission = null;
  {
    const { ctx, page } = await newPage();
    await login(page, "maya@lakeside.edu");
    await page.goto(`${BASE}/classes/${calc.id}/work/${assignmentId}`, { waitUntil: "networkidle" });
    await page.fill('textarea[name="content"]', "Here is my quiz answer.");
    const content = "e2e attachment " + Date.now();
    await page.setInputFiles('input[name="file"]', { name: "e2e-report.txt", mimeType: "text/plain", buffer: Buffer.from(content) });
    await page.click('button:has-text("Turn in")');
    await page.waitForSelector("text=/turned in/i", { timeout: 30000 });
    [submission] = await q("select id, file_name, file_path from submissions where assignment_id = ?", [assignmentId]);
    ok("student turned in with a file", Boolean(submission && submission.file_path), submission ? submission.file_name : "");
    if (submission && submission.file_path) {
      cleanupFiles.push(path.join(ROOT, "uploads", submission.file_path));
      const dl = await page.request.get(`${BASE}/api/files/${submission.id}`);
      ok("attachment downloads with the same bytes", dl.status() === 200 && (await dl.text()) === content, String(dl.status()));
      const onDisk = await fs.stat(path.join(ROOT, "uploads", submission.file_path)).then(() => true, () => false);
      ok("attachment stored in uploads/ (local mode)", onDisk);
    }
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage();
    await login(page, "cruz@lakeside.edu");
    await page.goto(`${BASE}/classes/${calc.id}/work/${assignmentId}`, { waitUntil: "networkidle" });
    const form = page.locator(`form:has(input[name="submissionId"][value="${submission.id}"])`);
    await form.locator('input[name="score"]').fill("9");
    await form.locator('input[name="feedback"]').fill("Nice work.");
    await form.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
    const [g] = await q("select score, feedback from submissions where id = ?", [submission.id]);
    ok("teacher graded the submission", g && Number(g.score) === 9 && g.feedback === "Nice work.", JSON.stringify(g));
    const dl = await page.request.get(`${BASE}/api/files/${submission.id}`);
    ok("teacher can download the attachment", dl.status() === 200);
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage();
    await login(page, "maya@lakeside.edu");
    await page.goto(`${BASE}/grades`, { waitUntil: "networkidle" });
    ok("student sees the graded work on Grades", (await page.content()).includes("E2E Quiz"));
    await page.goto(`${BASE}/classes/${calc.id}/work/${assignmentId}`, { waitUntil: "networkidle" });
    ok("student sees the score", /9\s*\/\s*10/.test(await page.locator("main").innerText()));
    await ctx.close();
  }

  /* ---------- admin posts an announcement with an image; student reads it ---------- */
  let announcement = null;
  {
    const { ctx, page } = await newPage();
    await login(page, "admin@lakeside.edu");
    await page.goto(`${BASE}/announcements`, { waitUntil: "networkidle" });
    await page.click('button:has-text("New announcement")');
    await page.fill('input[name="title"]', "E2E Notice");
    await page.fill('textarea[name="body"]', "Testing images through the storage layer.");
    const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5f0000000049454e44ae426082", "hex");
    await page.setInputFiles('input[name="image"]', { name: "e2e.png", mimeType: "image/png", buffer: png });
    await page.click('button:has-text("Post announcement")');
    await page.waitForSelector("text=E2E Notice", { timeout: 30000 });
    [announcement] = await q("select id, image_path from announcements where title = 'E2E Notice'");
    ok("admin posted an announcement with an image", Boolean(announcement && announcement.image_path));
    if (announcement && announcement.image_path) {
      cleanupFiles.push(path.join(ROOT, "uploads", "announcements", announcement.image_path));
      const img = await page.request.get(`${BASE}/api/images/${announcement.id}`);
      const body = await img.body();
      ok("image serves with the same bytes", img.status() === 200 && body.equals(png), `${img.status()} ${body.length}b`);
    }
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage();
    await login(page, "maya@lakeside.edu");
    await page.goto(`${BASE}/announcements`, { waitUntil: "networkidle" });
    const card = page.locator("article", { hasText: "E2E Notice" }).first();
    await card.locator('button:has-text("Mark as read")').click();
    await page.waitForTimeout(1200);
    const [r] = await q("select count(*) as n from announcement_reads where announcement_id = ?", [announcement.id]);
    ok("student marked the announcement read", r && Number(r.n) === 2, `reads ${r && r.n}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage();
    await login(page, "admin@lakeside.edu");
    await page.goto(`${BASE}/announcements`, { waitUntil: "networkidle" });
    const card = page.locator("article", { hasText: "E2E Notice" }).first();
    const receipt = (await card.innerText()).match(/Read by [0-9]+ of [0-9]+/);
    ok("admin sees the read receipt", Boolean(receipt), receipt ? receipt[0] : "no receipt text");
    await ctx.close();
  }

  /* ---------- admin: folder drag order and quarter setting ---------- */
  {
    const { ctx, page } = await newPage();
    await login(page, "admin@lakeside.edu");
    await page.goto(`${BASE}/admin/people`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const folders = page.locator("section:has(h2:text('Sections')) li[data-id]");
    const before = await folders.locator(".font-display").allTextContents();
    const a = await folders.nth(1).boundingBox();
    const b = await folders.nth(0).boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(a.x + a.width / 2 + ((b.x - a.x) * i) / 12, a.y + a.height / 2 + ((b.y - a.y) * i) / 12);
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.waitForTimeout(2000);
    const after = await folders.locator(".font-display").allTextContents();
    ok("folder drag reorders", after[0] === before[1], `${before.join(",")} -> ${after.join(",")}`);
    const [first] = await q("select grade_level || '-' || name as l from sections order by sort_order limit 1");
    ok("folder order saved", first && first.l === before[1], first && first.l);

    await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    await page.selectOption('select[name="currentQuarter"]', "2");
    await page.click('form:has(select[name="currentQuarter"]) button[type="submit"]');
    await page.waitForSelector("text=Saved.", { timeout: 30000 });
    const [sc] = await q("select current_quarter from schools");
    ok("current quarter saved", sc && Number(sc.current_quarter) === 2, String(sc && sc.current_quarter));
    await page.reload({ waitUntil: "networkidle" });
    ok("quarter shown after reload", (await page.inputValue('select[name="currentQuarter"]')) === "2");
    await page.selectOption('select[name="currentQuarter"]', "1");
    await page.click('form:has(select[name="currentQuarter"]) button[type="submit"]');
    await page.waitForSelector("text=Saved.", { timeout: 30000 });
    await ctx.close();
  }

  /* ---------- phone: drawer opens ---------- */
  {
    const { ctx, page } = await newPage({ ...devices["iPhone 13"] });
    await login(page, "maya@lakeside.edu");
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    const aside = page.locator("aside#portal-sidebar");
    const before = await aside.boundingBox();
    await page.tap('button[aria-label="Open menu"]');
    await page.waitForTimeout(400);
    const after = await aside.boundingBox();
    ok("phone drawer opens", before && after && before.x < 0 && after.x >= 0, `x ${before && before.x} -> ${after && after.x}`);
    await ctx.close();
  }
} catch (e) {
  results.push("FAIL crashed: " + String(e.message).split("\n")[0]);
} finally {
  await browser.close();
  dbc.close();
  for (const f of cleanupFiles) await fs.rm(f, { force: true }).catch(() => {});
}

console.log(results.join("\n"));
console.log("page errors:", errors.length ? errors.join(" | ") : "none");
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
