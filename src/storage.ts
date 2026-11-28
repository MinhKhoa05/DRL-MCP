import { readFile, writeFile, appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const POSTS_FILE = fileURLToPath(new URL("../data/posts.jsonl", import.meta.url));
export const DRL_POSTS_FILE = fileURLToPath(new URL("../data/drl_posts.jsonl", import.meta.url));
export const META_FILE = fileURLToPath(new URL("../data/crawl_meta.json", import.meta.url));
export const PAGES_FILE = fileURLToPath(new URL("../data/pages.json", import.meta.url));
export const MAX_CHARS = 3000;

export interface Page {
  url: string;
  name?: string;
}

export interface StoredPost {
  page: string;
  link: string;
  date: string;
  message: string;
}

export async function listPages(): Promise<Page[]> {
  try {
    return JSON.parse(await readFile(PAGES_FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function readStored(filePath: string = POSTS_FILE): Promise<StoredPost[]> {
  try {
    const text = await readFile(filePath, "utf8");
    const posts: StoredPost[] = [];
    for (const line of text.split("\n")) {
      if (line.trim()) {
        try {
          posts.push(JSON.parse(line));
        } catch {}
      }
    }
    return posts;
  } catch {
    return [];
  }
}

export async function writeStored(filePath: string, posts: StoredPost[]): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const content = posts.map((p) => JSON.stringify(p)).join("\n") + (posts.length ? "\n" : "");
  await writeFile(filePath, content, "utf8");
}

export async function appendStored(filePath: string, posts: StoredPost[]): Promise<void> {
  if (!posts.length) return;
  await mkdir(dirname(filePath), { recursive: true });
  const content = posts.map((p) => JSON.stringify(p)).join("\n") + "\n";
  await appendFile(filePath, content, "utf8");
}

export async function readLastCrawledAt(): Promise<string | null> {
  try {
    const meta = JSON.parse(await readFile(META_FILE, "utf8"));
    return typeof meta?.lastCrawledAt === "string" ? meta.lastCrawledAt : null;
  } catch {
    return null;
  }
}

export async function writeLastCrawledAt(lastCrawledAt: string): Promise<void> {
  await mkdir(dirname(META_FILE), { recursive: true });
  await writeFile(META_FILE, JSON.stringify({ lastCrawledAt }, null, 2), "utf8");
}
