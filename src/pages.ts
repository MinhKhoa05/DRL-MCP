import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PAGES_FILE = process.env.PAGES_FILE ?? fileURLToPath(new URL("../data/pages.json", import.meta.url));

export interface Page {
  url: string;
  name?: string;
}

const normalizeUrl = (url: string) => url.trim().toLowerCase().replace(/\/$/, "");

export async function savePages(pages: Page[]): Promise<void> {
  await mkdir(dirname(PAGES_FILE), { recursive: true });
  await writeFile(PAGES_FILE, JSON.stringify(pages, null, 2), "utf8");
}

export async function listPages(): Promise<Page[]> {
  try {
    return JSON.parse(await readFile(PAGES_FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function addPages(
  items: Array<{ url: string; name?: string }>
): Promise<{ added: Page[]; updated: Page[]; total: number }> {
  const pages = await listPages();
  const added: Page[] = [];
  const updated: Page[] = [];

  for (const item of items) {
    if (!item.url) continue;
    const norm = normalizeUrl(item.url);
    const existing = pages.find((p) => normalizeUrl(p.url) === norm);
    if (existing) {
      if (item.name && item.name.trim()) existing.name = item.name.trim();
      updated.push(existing);
    } else {
      const newPage: Page = {
        url: item.url.trim(),
        name: item.name?.trim() || item.url.trim(),
      };
      pages.push(newPage);
      added.push(newPage);
    }
  }

  await savePages(pages);
  return { added, updated, total: pages.length };
}

export async function removePages(
  targets: string[]
): Promise<{ removed: Page[]; remaining: number }> {
  const pages = await listPages();
  const targetSet = new Set(targets.map((t) => t.trim().toLowerCase().replace(/\/$/, "")));
  const removed: Page[] = [];
  const remainingPages: Page[] = [];

  for (const p of pages) {
    const urlNorm = normalizeUrl(p.url);
    const nameNorm = p.name ? p.name.trim().toLowerCase() : "";
    if (targetSet.has(urlNorm) || (nameNorm && targetSet.has(nameNorm))) {
      removed.push(p);
    } else {
      remainingPages.push(p);
    }
  }

  await savePages(remainingPages);
  return { removed, remaining: remainingPages.length };
}


