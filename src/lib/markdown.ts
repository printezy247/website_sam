import { marked } from "marked";
/** Render our own model-generated markdown. Strips script/iframe/on* attributes defensively. */
export function renderMarkdown(md: string) {
  const html = marked.parse(md, { async: false }) as string;
  return html.replace(/<\/?(script|iframe|object|embed|style)[^>]*>/gi, "").replace(/\son\w+="[^"]*"/gi, "");
}
