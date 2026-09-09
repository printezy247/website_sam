// The reader loads the pdf.js worker from /pdfjs/. Keep the copy in public/ in step with the package.
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const root = process.cwd();
mkdirSync(join(root, "public/pdfjs"), { recursive: true });
copyFileSync(join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"), join(root, "public/pdfjs/pdf.worker.min.mjs"));
console.log("pdf worker copied to public/pdfjs");
