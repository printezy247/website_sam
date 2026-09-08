/** Minimal CSV parser (handles quoted fields, CRLF). Returns rows as objects keyed by lower-cased header. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === "," || c === ";" || c === "\t") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

/** Find HFM partner-report columns by fuzzy header names. */
export function pickHfmColumns(row: Record<string, string>) {
  const keys = Object.keys(row);
  const find = (...cands: string[]) => keys.find((k) => cands.some((c) => k.includes(c)));
  return {
    account: find("login", "account", "mt4", "mt5", "acc"),
    name: find("name", "client"),
    deposit: find("deposit", "net deposit", "funded"),
    balance: find("balance", "equity"),
  };
}
