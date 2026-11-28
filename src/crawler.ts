import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  POSTS_FILE,
  DRL_POSTS_FILE,
  type StoredPost,
  listPages,
  readStored,
  appendStored,
  readLastCrawledAt,
  writeLastCrawledAt,
} from "./storage.ts";
import { isDrlPost } from "./filter.ts";

const run = promisify(execFile);
const PY = process.platform === "win32" ? "py" : "python3";
const CONCURRENCY = 8;
const DEFAULT_DAYS = 7;
const STALE_MS = 30 * 60 * 1000; // 30 phút
const SCRAPE_TIMEOUT_MS = 120_000;

async function scrape(url: string, after: string, before?: string) {
  const dir = await mkdtemp(join(tmpdir(), "fbgql-"));
  const out = join(dir, "out.json");
  try {
    await run(
      PY,
      [
        "-m",
        "fbgql.cli",
        "scrape",
        "--page",
        url,
        "--after",
        after,
        ...(before ? ["--before", before] : []),
        "--posts-only",
        "--out",
        out,
      ],
      { timeout: SCRAPE_TIMEOUT_MS, env: { ...process.env, PYTHONIOENCODING: "utf-8" } }
    );
    const raw = JSON.parse(await readFile(out, "utf8"));
    return (raw.posts ?? []).map(({ post }: any) => ({
      link: post.permalink as string,
      date: post.created_time ? new Date(post.created_time * 1000).toISOString() : "",
      message: (post.text ?? "") as string,
    }));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function getDefaultAfter(days = DEFAULT_DAYS): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function crawlPosts(opts: { after?: string; before?: string } = {}) {
  const pages = await listPages();
  const after = opts.after || getDefaultAfter();
  const known = new Set((await readStored(POSTS_FILE)).map((p) => p.link));
  const knownDrl = new Set((await readStored(DRL_POSTS_FILE)).map((p) => p.link));
  const scrapedAt = new Date().toISOString();
  const summary: { page: string; newPosts: number; newDrlPosts: number; error?: string }[] = [];

  const queue = [...pages];
  let totalNew = 0;
  let totalNewDrl = 0;

  async function worker() {
    while (queue.length > 0) {
      const p = queue.shift();
      if (!p) break;
      const page = p.name ?? p.url;
      try {
        const scraped = await scrape(p.url, after, opts.before);
        const newAll: StoredPost[] = [];
        const newDrl: StoredPost[] = [];

        for (const post of scraped) {
          if (!post.link || known.has(post.link)) continue;
          known.add(post.link);
          const item: StoredPost = { page, ...post };
          newAll.push(item);

          if (isDrlPost(post.message) && !knownDrl.has(post.link)) {
            knownDrl.add(post.link);
            newDrl.push(item);
          }
        }

        await appendStored(POSTS_FILE, newAll);
        await appendStored(DRL_POSTS_FILE, newDrl);

        totalNew += newAll.length;
        totalNewDrl += newDrl.length;
        summary.push({ page, newPosts: newAll.length, newDrlPosts: newDrl.length });
      } catch (e) {
        summary.push({ page, newPosts: 0, newDrlPosts: 0, error: String(e) });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pages.length) }, () => worker()));
  await writeLastCrawledAt(scrapedAt);

  return { scrapedAt, newPosts: totalNew, newDrlPosts: totalNewDrl, pages: summary };
}

// Tự động cào mới nếu chưa có dữ liệu hoặc lần cào gần nhất đã quá 30 phút
export async function ensureFreshData() {
  const lastCrawledAt = await readLastCrawledAt();
  const isStale = !lastCrawledAt || Date.now() - new Date(lastCrawledAt).getTime() > STALE_MS;
  if (!isStale) return;

  try {
    await crawlPosts({ after: lastCrawledAt ? lastCrawledAt.slice(0, 10) : undefined });
  } catch (e) {
    console.error("[ensureFreshData] Crawl error:", e);
  }
}
