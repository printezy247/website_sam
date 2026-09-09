import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const base = "az=-28&el=14&d=2.35&exp=1.8";
const poses = { strike: `pose=strike&${base}`, raise: `pose=raise&deg=125&axis=-0.25,0,-0.97&${base}` };
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
const boxes = {};
for (const [k, q] of Object.entries(poses)) {
  await p.goto("http://localhost:8765/render.html?" + q); await p.waitForFunction(() => window.__done, null, { timeout: 120000 });
  boxes[k] = await p.evaluate(() => { const c = document.getElementById("c"); const g = c.getContext("webgl2") || c.getContext("webgl"); const w = c.width, h = c.height; const px = new Uint8Array(w*h*4); g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,px); let x0=w,y0=h,x1=0,y1=0; for (let y=0;y<h;y++) for (let x=0;x<w;x++) { if (px[(y*w+x)*4+3]>8) { if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } } return { x0, x1, y0: h-1-y1, y1: h-1-y0 }; });
}
console.log(JSON.stringify(boxes));
const x0 = Math.min(boxes.strike.x0, boxes.raise.x0) - 12, x1 = Math.max(boxes.strike.x1, boxes.raise.x1) + 12;
const y0 = Math.min(boxes.strike.y0, boxes.raise.y0) - 12, y1 = Math.max(boxes.strike.y1, boxes.raise.y1) + 12;
const side = Math.max(x1 - x0, y1 - y0); const cx = (x0 + x1) / 2; let sx = Math.round(cx - side / 2); let sy = y1 - side; // anchor bottom
sx = Math.max(0, Math.min(sx, 1024 - side)); sy = Math.max(0, Math.min(sy, 1024 - side));
console.log("clip", sx, sy, side);
for (const [k, q] of Object.entries(poses)) {
  await p.goto("http://localhost:8765/render.html?" + q); await p.waitForFunction(() => window.__done, null, { timeout: 120000 });
  await p.screenshot({ path: `public/brand/mascot-${k}.png`, omitBackground: true, clip: { x: sx, y: sy, width: side, height: side } });
}
await b.close();
