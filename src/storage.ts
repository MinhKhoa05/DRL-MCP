import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const POSTS_FILE = process.env.POSTS_FILE ?? fileURLToPath(new URL("../data/posts.jsonl", import.meta.url));
export const DRL_POSTS_FILE = process.env.DRL_POSTS_FILE ?? fileURLToPath(new URL("../data/drl_posts.jsonl", import.meta.url));
export const META_FILE = process.env.CRAWL_META_FILE ?? fileURLToPath(new URL("../data/crawl_meta.json", import.meta.url));
export const PAGES_FILE = process.env.PAGES_FILE ?? fileURLToPath(new URL("../data/pages.json", import.meta.url));
export const MAX_CHARS = 3000;

export interface Page {
  url: string;
  name?: string;
}

export async function listPages(): Promise<Page[]> {
  try {
    return JSON.parse(await readFile(PAGES_FILE, "utf8"));
  } catch {
    return [];
  }
}

export interface StoredPost {
  page: string;
  link: string;
  date: string; // ISO
  message: string;
}

export async function readStored(filePath: string = POSTS_FILE): Promise<StoredPost[]> {
  let text = "";
  try {
    text = await readFile(filePath, "utf8");
  } catch {
    return [];
  }
  const posts: StoredPost[] = [];
  for (const line of text.split("\n")) {
    try {
      if (line.trim()) posts.push(JSON.parse(line));
    } catch {}
  }
  return posts;
}

export async function writeStored(filePath: string, posts: StoredPost[]): Promise<void> {
  const content = posts.map((p) => JSON.stringify(p)).join("\n") + (posts.length ? "\n" : "");
  await writeFile(filePath, content, "utf8");
}
