// Render page 1 of every bundled ebook PDF to a cover PNG under public/ebooks/<slug>.png.
// Same approach as tools/mascot-render.mjs: headless Chromium via Playwright, pdf.js in the page.
// Run once after adding an ebook: npm run covers
import { createServer } from "node:http";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const root = process.cwd();
const seed = readFileSync(join(root, "src/db/seed.ts"), "utf8");
// slug + filePath of every ebook row in the seed catalog
const books = [...seed.matchAll(/\{ slug: "([^"]+)", type: "ebook"[^\n]*?filePath: "([^"]+)"/g)].map(([, slug, file]) => ({ slug, file }));
if (!books.length) { console.error("no ebook rows found in seed"); process.exit(1); }

const types = { ".html": "text/html", ".mjs": "text/javascript", ".pdf": "application/pdf", ".map": "application/json" };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const path = url.startsWith("/pdfjs/") ? join(root, "node_modules/pdfjs-dist/build", url.slice(7))
    : url.startsWith("/pdf/") ? join(root, "assets", url.slice(5))
    : join(root, "tools", url === "/" ? "ebook-cover.html" : url.slice(1));
  if (!existsSync(path)) { res.writeHead(404).end("nope"); return; }
  res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(8766, r));

mkdirSync(join(root, "public/ebooks"), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 1200 }, deviceScaleFactor: 1 });
for (const b of books) {
  if (!existsSync(join(root, "assets", b.file))) { console.warn("skip (no file)", b.slug); continue; }
  await page.goto(`http://localhost:8766/ebook-cover.html?f=${encodeURIComponent(b.file)}&w=720`);
  await page.waitForFunction(() => window.__done, null, { timeout: 60000 });
  const size = await page.evaluate(() => window.__size);
  await page.screenshot({ path: join(root, "public/ebooks", `${b.slug}.png`), clip: { x: 0, y: 0, ...{ width: size.w, height: size.h } } });
  console.log("cover", b.slug, `${size.w}x${size.h}`);
}
await browser.close();
server.close();
